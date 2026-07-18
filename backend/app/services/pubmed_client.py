import asyncio
import time
import re
import xml.etree.ElementTree as ET
from typing import List, Dict, Any, Optional
import httpx
from app.utils.logger import get_logger

logger = get_logger("app.services.pubmed_client")

PUBMED_BASE_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
TOOL_NAME = "mediguard-v2"
EMAIL = "mediguard@clinical.ai"


class PubMedClient:
    """PubMed E-utilities client with built-in rate-limiting and robust XML parser."""

    def __init__(self):
        self.client = httpx.AsyncClient(
            timeout=30.0,
            headers={"User-Agent": "MediGuardV2/2.0"}
        )
        self.base_url = PUBMED_BASE_URL
        self.tool = TOOL_NAME
        self.email = EMAIL
        self.rate_limit_delay = 0.34  # NCBI limit: max 3 requests/second
        self.last_request_time = 0.0

    async def _rate_limited_get(self, url: str, params: dict, is_xml: bool = False) -> Any:
        """Helper to make a rate-limited GET request to PubMed E-utilities."""
        # Calculate elapsed time since last request
        elapsed = time.time() - self.last_request_time
        if elapsed < self.rate_limit_delay:
            await asyncio.sleep(self.rate_limit_delay - elapsed)

        # Inject standard NCBI identification parameters
        params["tool"] = self.tool
        params["email"] = self.email

        if not is_xml:
            params["retmode"] = "json"

        try:
            logger.debug("Requesting PubMed E-utilities API", url=url, params=params)
            response = await self.client.get(url, params=params)
            response.raise_for_status()
            self.last_request_time = time.time()
            
            if is_xml:
                return response.text
            return response.json()
        except Exception as e:
            logger.error("PubMed API request failed", url=url, error=str(e))
            self.last_request_time = time.time()
            raise e

    async def search_articles(
        self,
        query: str,
        max_results: int = 20,
        min_year: int = 2018,
        article_types: Optional[List[str]] = None
    ) -> List[str]:
        """Search PubMed and return list of PMID strings."""
        try:
            # Build search query term with filters
            full_query = (
                f"({query})"
                f" AND {min_year}:2024[pdat]"
                f" AND English[lang]"
                f" AND hasabstract[text]"
            )

            # Inject publication type filters if specified
            if article_types:
                pt_filters = " OR ".join([f'"{pt}"' for pt in article_types])
                full_query += f" AND ({pt_filters})[pt]"

            url = f"{self.base_url}/esearch.fcgi"
            params = {
                "db": "pubmed",
                "term": full_query,
                "retmax": str(max_results),
                "sort": "relevance",
                "usehistory": "y"
            }

            result = await self._rate_limited_get(url, params)
            pmids = result.get("esearchresult", {}).get("idlist", [])
            logger.info("PubMed search completed", query=query, pmids_found=len(pmids))
            return pmids
        except Exception as e:
            logger.error("Error searching PubMed articles", query=query, error=str(e))
            return []

    async def fetch_article_details(self, pmids: List[str]) -> List[Dict[str, Any]]:
        """Fetch full details for list of PMIDs in batches of 20 to respect rate limits."""
        if not pmids:
            return []

        articles = []
        # Batch in groups of 20
        batch_size = 20
        for i in range(0, len(pmids), batch_size):
            batch_pmids = pmids[i : i + batch_size]
            pmid_str = ",".join(batch_pmids)

            try:
                # 1. Fetch XML Abstract details
                efetch_url = f"{self.base_url}/efetch.fcgi"
                efetch_params = {
                    "db": "pubmed",
                    "id": pmid_str,
                    "rettype": "abstract",
                    "retmode": "xml"
                }
                xml_data = await self._rate_limited_get(efetch_url, efetch_params, is_xml=True)

                # 2. Fetch JSON Summary for cross-reference/fallback
                esummary_url = f"{self.base_url}/esummary.fcgi"
                esummary_params = {
                    "db": "pubmed",
                    "id": pmid_str
                }
                summary_data = await self._rate_limited_get(esummary_url, esummary_params)

                # Parse the XML abstracts
                parsed_articles = self._parse_pubmed_xml(xml_data)

                # Merge and validate
                for pmid in batch_pmids:
                    if pmid not in parsed_articles:
                        continue
                    
                    art = parsed_articles[pmid]
                    # Filter: skip articles with abstract < 100 words
                    if art["word_count"] < 100:
                        logger.debug("Skipping article with short abstract", pmid=pmid, word_count=art["word_count"])
                        continue
                    
                    articles.append(art)

            except Exception as e:
                logger.error("Error fetching article details for batch", pmids=batch_pmids, error=str(e))

        logger.info("PubMed details fetch completed", requested=len(pmids), fetched=len(articles))
        return articles

    def _parse_pubmed_xml(self, xml_content: str) -> Dict[str, Dict[str, Any]]:
        """Parse PubMed XML representation to structured dict."""
        articles = {}
        try:
            root = ET.fromstring(xml_content)
            for article_node in root.findall(".//PubmedArticle"):
                # PMID
                pmid_node = article_node.find(".//PMID")
                if pmid_node is None or not pmid_node.text:
                    continue
                pmid = pmid_node.text.strip()

                # Title
                title_node = article_node.find(".//ArticleTitle")
                title = ""
                if title_node is not None:
                    title = "".join(title_node.itertext()).strip()
                    if title.endswith("."):
                        title = title[:-1]

                # Abstract
                abstract_texts = []
                for text_node in article_node.findall(".//AbstractText"):
                    label = text_node.get("Label")
                    text_val = "".join(text_node.itertext()).strip()
                    if text_val:
                        if label:
                            abstract_texts.append(f"{label}: {text_val}")
                        else:
                            abstract_texts.append(text_val)
                abstract = "\n".join(abstract_texts).strip()

                # Authors
                authors_list = []
                for author_node in article_node.findall(".//Author"):
                    last_name = author_node.find("LastName")
                    initials = author_node.find("Initials")
                    if last_name is not None and last_name.text:
                        author_name = last_name.text
                        if initials is not None and initials.text:
                            author_name += f" {initials.text}"
                        authors_list.append(author_name)

                if not authors_list:
                    authors = "Unknown Authors"
                elif len(authors_list) <= 3:
                    authors = ", ".join(authors_list)
                else:
                    authors = ", ".join(authors_list[:3]) + ", et al."

                # Journal
                journal_node = article_node.find(".//Journal/Title")
                journal = journal_node.text.strip() if journal_node is not None and journal_node.text else "Unknown Journal"

                # Journal Abbr
                journal_abbr_node = article_node.find(".//Journal/ISOAbbreviation")
                journal_abbr = journal_abbr_node.text.strip() if journal_abbr_node is not None and journal_abbr_node.text else journal

                # Publication Date/Year
                pub_date_node = article_node.find(".//Journal/JournalIssue/PubDate")
                pub_year = ""
                pub_date_str = ""
                if pub_date_node is not None:
                    year_node = pub_date_node.find("Year")
                    month_node = pub_date_node.find("Month")
                    day_node = pub_date_node.find("Day")
                    medline_date_node = pub_date_node.find("MedlineDate")

                    if year_node is not None and year_node.text:
                        pub_year = year_node.text.strip()
                        pub_date_str = pub_year
                        if month_node is not None and month_node.text:
                            pub_date_str += f" {month_node.text.strip()}"
                            if day_node is not None and day_node.text:
                                pub_date_str += f" {day_node.text.strip()}"
                    elif medline_date_node is not None and medline_date_node.text:
                        pub_date_str = medline_date_node.text.strip()
                        match = re.search(r"\b(20\d{2}|19\d{2})\b", pub_date_str)
                        if match:
                            pub_year = match.group(1)

                if not pub_year:
                    pub_year = "Unknown Year"
                if not pub_date_str:
                    pub_date_str = pub_year

                # Article Type
                article_types = []
                for pt_node in article_node.findall(".//PublicationTypeList/PublicationType"):
                    if pt_node.text:
                        article_types.append(pt_node.text.strip())
                article_type = article_types[0] if article_types else "Journal Article"

                # DOI
                doi = ""
                for id_node in article_node.findall(".//ArticleIdList/ArticleId"):
                    if id_node.get("IdType") == "doi" and id_node.text:
                        doi = id_node.text.strip()
                        break

                # Citations formatting (Smith J, et al. J Am Coll Cardiol. 2023;81(10):987-999. PMID: 37291847)
                volume_node = article_node.find(".//Journal/JournalIssue/Volume")
                issue_node = article_node.find(".//Journal/JournalIssue/Issue")
                medline_pg_node = article_node.find(".//MedlinePgn")

                vol_issue = ""
                if volume_node is not None and volume_node.text:
                    vol_issue = volume_node.text.strip()
                    if issue_node is not None and issue_node.text:
                        vol_issue += f"({issue_node.text.strip()})"

                pages = medline_pg_node.text.strip() if medline_pg_node is not None and medline_pg_node.text else ""

                citation_parts = [authors]
                if journal_abbr:
                    citation_parts.append(journal_abbr)

                date_vol_pg = f"{pub_year}"
                if vol_issue:
                    date_vol_pg += f";{vol_issue}"
                if pages:
                    date_vol_pg += f":{pages}"
                citation_parts.append(date_vol_pg)
                citation_parts.append(f"PMID: {pmid}")

                citation = ". ".join(citation_parts) + "."

                articles[pmid] = {
                    "pmid": pmid,
                    "title": title,
                    "abstract": abstract,
                    "authors": authors,
                    "journal": journal,
                    "journal_abbr": journal_abbr,
                    "publication_year": pub_year,
                    "publication_date": pub_date_str,
                    "article_type": article_type,
                    "doi": doi,
                    "citation": citation,
                    "pubmed_url": f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/",
                    "word_count": len(abstract.split()),
                    "has_full_abstract": bool(abstract.strip())
                }
        except Exception as e:
            logger.error("Error parsing PubMed XML content", error=str(e))
        return articles

    async def search_and_fetch(self, query: str, max_results: int = 20, min_year: int = 2018) -> List[Dict[str, Any]]:
        """Combine search and details fetch logic in a single invocation."""
        logger.info("Executing search_and_fetch", query=query, max_results=max_results)
        pmids = await self.search_articles(query, max_results=max_results, min_year=min_year)
        if not pmids:
            return []
        return await self.fetch_article_details(pmids)

    async def close(self):
        """Close connection client."""
        await self.client.aclose()


pubmed_client = PubMedClient()
