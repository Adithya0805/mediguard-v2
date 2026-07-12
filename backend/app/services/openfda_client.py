import re
import httpx
import asyncio
from itertools import combinations
from typing import Any, Dict, List, Optional
from app.utils.logger import get_logger

logger = get_logger("app.services.openfda_client")

BASE_URL = "https://api.fda.gov/drug"

def _to_list(val: Any) -> List[str]:
    """Helper to convert any label field (string, list, or None) to a clean flat list of strings."""
    if not val:
        return []
    if isinstance(val, list):
        res = []
        for item in val:
            if isinstance(item, str):
                res.extend([line.strip() for line in item.split("\n") if line.strip()])
            else:
                res.append(str(item))
        return res
    if isinstance(val, str):
        return [line.strip() for line in val.split("\n") if line.strip()]
    return [str(val)]

class OpenFDAClient:
    """Asynchronous client for US FDA public drug reference API."""

    def __init__(self) -> None:
        self.session = httpx.AsyncClient(timeout=10.0)
        self.base_url = BASE_URL
        logger.info("OpenFDAClient initialized")

    async def search_drug_label(self, drug_name: str) -> Optional[Dict[str, Any]]:
        """
        Cleans the drug name to strip dosage information, and queries the FDA Label API.
        Returns the first matched drug label result, or None if not found/error.
        """
        if not drug_name:
            return None

        # Clean drug name: e.g. "metformin 500mg BD" -> "metformin"
        cleaned_drug = re.sub(r'\s+\d+.*$', '', drug_name.lower()).strip()
        if not cleaned_drug:
            cleaned_drug = drug_name.lower().strip()

        logger.debug("Querying OpenFDA label data", drug_name=drug_name, cleaned_drug=cleaned_drug)
        
        search_query = f'openfda.brand_name:"{cleaned_drug}" OR openfda.generic_name:"{cleaned_drug}"'
        params = {
            "search": search_query,
            "limit": 1
        }

        try:
            resp = await self.session.get(f"{self.base_url}/label.json", params=params)
            if resp.status_code == 200:
                data = resp.json()
                results = data.get("results", [])
                if results:
                    logger.debug("OpenFDA label found", drug_name=drug_name, cleaned_drug=cleaned_drug)
                    return results[0]
            elif resp.status_code == 404:
                logger.debug("OpenFDA label not found", drug_name=drug_name, cleaned_drug=cleaned_drug)
            else:
                logger.warning(
                    "OpenFDA API returned unexpected status code",
                    status_code=resp.status_code,
                    body=resp.text[:200]
                )
        except httpx.TimeoutException:
            logger.warning("OpenFDA API timeout", drug_name=drug_name)
        except Exception as e:
            logger.error("OpenFDA API request error", drug_name=drug_name, error=str(e))
        
        return None

    async def get_drug_interactions(self, drug_name: str) -> List[str]:
        """Retrieves documented drug interactions for a medication."""
        label = await self.search_drug_label(drug_name)
        if not label:
            return []
        
        val = label.get("drug_interactions") or []
        res = _to_list(val)
        logger.info("Retrieved OpenFDA interactions", drug_name=drug_name, count=len(res))
        return res

    async def get_drug_warnings(self, drug_name: str) -> List[str]:
        """Retrieves warnings, boxed warnings, and warnings and cautions for a medication."""
        label = await self.search_drug_label(drug_name)
        if not label:
            return []
        
        # Try both warnings and warnings_and_cautions
        warnings_val = label.get("warnings") or label.get("warnings_and_cautions") or []
        boxed_val = label.get("boxed_warning") or []
        
        res = _to_list(warnings_val) + _to_list(boxed_val)
        logger.info("Retrieved OpenFDA warnings", drug_name=drug_name, count=len(res))
        return res

    async def get_drug_contraindications(self, drug_name: str) -> List[str]:
        """Retrieves contraindications for a medication."""
        label = await self.search_drug_label(drug_name)
        if not label:
            return []
        
        val = label.get("contraindications") or []
        res = _to_list(val)
        logger.info("Retrieved OpenFDA contraindications", drug_name=drug_name, count=len(res))
        return res

    async def check_drug_pair(self, drug_a: str, drug_b: str) -> Dict[str, Any]:
        """Checks if there is a documented interaction between two drugs."""
        cleaned_a = re.sub(r'\s+\d+.*$', '', drug_a.lower()).strip()
        cleaned_b = re.sub(r'\s+\d+.*$', '', drug_b.lower()).strip()

        # Gather interactions for both concurrently
        interactions_a, interactions_b = await asyncio.gather(
            self.get_drug_interactions(drug_a),
            self.get_drug_interactions(drug_b)
        )

        drug_a_warns_about_b = False
        relevant_warnings = []
        for interaction in interactions_a:
            if cleaned_b in interaction.lower():
                drug_a_warns_about_b = True
                relevant_warnings.append(f"FDA Label - {drug_a} warning: {interaction}")

        drug_b_warns_about_a = False
        for interaction in interactions_b:
            if cleaned_a in interaction.lower():
                drug_b_warns_about_a = True
                relevant_warnings.append(f"FDA Label - {drug_b} warning: {interaction}")

        interaction_found = drug_a_warns_about_b or drug_b_warns_about_a

        return {
            "drug_a": drug_a,
            "drug_b": drug_b,
            "interaction_found": interaction_found,
            "drug_a_warns_about_b": drug_a_warns_about_b,
            "drug_b_warns_about_a": drug_b_warns_about_a,
            "relevant_warnings": relevant_warnings
        }

    async def batch_check_medications(self, medications: List[str]) -> Dict[str, Any]:
        """Concurrently runs checks across all unique pairs and fetches all warnings/contraindications."""
        # De-duplicate
        unique_meds = sorted(list(set([m.strip() for m in medications if m.strip()])))
        
        # Build pairwise checks
        pairs = list(combinations(unique_meds, 2))
        
        # Build tasks list
        pair_tasks = [self.check_drug_pair(a, b) for a, b in pairs]
        warnings_tasks = [self.get_drug_warnings(med) for med in unique_meds]
        contra_tasks = [self.get_drug_contraindications(med) for med in unique_meds]

        # Await all concurrently
        results = await asyncio.gather(
            *pair_tasks,
            *warnings_tasks,
            *contra_tasks
        )

        num_pairs = len(pairs)
        num_meds = len(unique_meds)

        pair_results = results[:num_pairs]
        warnings_results = results[num_pairs : num_pairs + num_meds]
        contra_results = results[num_pairs + num_meds :]

        interactions_found = [r for r in pair_results if r["interaction_found"]]
        
        all_warnings = {
            med: warns for med, warns in zip(unique_meds, warnings_results)
        }
        all_contraindications = {
            med: contras for med, contras in zip(unique_meds, contra_results)
        }

        return {
            "medications_checked": unique_meds,
            "pairs_checked": num_pairs,
            "interactions_found": interactions_found,
            "all_warnings": all_warnings,
            "all_contraindications": all_contraindications
        }

    async def close(self) -> None:
        """Closes the HTTPX connection session."""
        await self.session.aclose()
        logger.info("OpenFDAClient session closed")

# Singleton export
fda_client = OpenFDAClient()
