"""
MediGuard V2 — Smart Symptom Suggestion Service
Day 6: Symptom Intelligence Engine

Pure in-memory lookup against the SYMPTOM_CLUSTERS knowledge base.
No AI calls — all responses in < 1ms.
"""

from __future__ import annotations

from app.data.symptom_clusters import SYMPTOM_CLUSTERS, SYMPTOM_ALIASES


class SymptomSuggester:
    """
    Provides real-time clinical symptom suggestions based on a structured
    knowledge base. All lookups are pure dictionary operations — zero latency.
    """

    URGENCY_RANK = {"critical": 4, "high": 3, "medium": 2, "low": 1}

    def __init__(self) -> None:
        self.clusters = SYMPTOM_CLUSTERS
        self.aliases = SYMPTOM_ALIASES

        # Build a flat index of every known symptom / related symptom for autocomplete
        self._all_terms: set[str] = set()
        for key, cluster in self.clusters.items():
            self._all_terms.add(key)
            for rs in cluster.get("related_symptoms", []):
                self._all_terms.add(rs)
        # Also include alias keys so colloquial terms surface in autocomplete
        for alias_key in self.aliases:
            self._all_terms.add(alias_key)

    # ── Normalisation ────────────────────────────────────────────────────────

    def normalize_symptom(self, term: str) -> tuple[str, bool]:
        """
        Lowercase + strip, then check alias table.
        Returns (normalized_term, was_aliased).
        """
        cleaned = term.strip().lower()
        if cleaned in self.aliases:
            return self.aliases[cleaned], True
        return cleaned, False

    # ── Core Suggestion Engine ───────────────────────────────────────────────

    def get_suggestions(
        self,
        current_symptoms: list[str],
        partial_input: str = "",
        max_suggestions: int = 8,
    ) -> dict:
        """
        Main entry point called by the API route.

        Returns a dict with:
          - autocomplete        : list of autocomplete matches for partial_input
          - related_suggestions : scored related symptom chips
          - clinical_questions  : deduped questions to ask the patient
          - current_urgency_hint: highest urgency level across current clusters
          - red_flags_detected  : list of matched red-flag combinations
        """
        # Normalise current symptom list
        normalised = [self.normalize_symptom(s)[0] for s in current_symptoms]
        normalised_set = set(normalised)

        autocomplete = self._autocomplete(partial_input, normalised_set)
        related, clinical_questions = self._related_and_questions(normalised, normalised_set)
        urgency = self._compute_urgency(normalised)
        red_flags = self._detect_red_flags(normalised, normalised_set)

        # Cap at max_suggestions
        related = related[:max_suggestions]

        return {
            "autocomplete": autocomplete,
            "related_suggestions": related,
            "clinical_questions": clinical_questions[:4],
            "current_urgency_hint": urgency,
            "red_flags_detected": red_flags,
        }

    # ── Private Helpers ──────────────────────────────────────────────────────

    def _autocomplete(self, partial: str, excluded: set[str]) -> list[dict]:
        """Return matching terms for the partial input string."""
        if not partial or len(partial.strip()) < 2:
            return []

        q = partial.strip().lower()
        results: list[dict] = []

        for term in self._all_terms:
            if term in excluded:
                continue
            if term.startswith(q):
                match_type = "prefix"
            elif q in term:
                match_type = "contains"
            else:
                continue

            # Build display label
            cluster = self.clusters.get(term)
            display = cluster["display"] if cluster else term.title()

            results.append({
                "symptom": term,
                "display": display,
                "match_type": match_type,
            })

        # Prefix matches first, then contains
        results.sort(key=lambda x: (0 if x["match_type"] == "prefix" else 1, x["symptom"]))
        return results[:5]

    def _related_and_questions(
        self, normalised: list[str], normalised_set: set[str]
    ) -> tuple[list[dict], list[str]]:
        """
        Score related symptoms across all clusters of current symptoms.
        Also collect ask_about questions.
        """
        # symptom_key → score
        score_map: dict[str, int] = {}
        questions: list[str] = []
        seen_questions: set[str] = set()

        for sym in normalised:
            cluster = self.clusters.get(sym)
            if not cluster:
                continue

            for q in cluster.get("ask_about", []):
                if q not in seen_questions:
                    seen_questions.add(q)
                    questions.append(q)

            for related in cluster.get("related_symptoms", []):
                if related in normalised_set:
                    continue
                score_map[related] = score_map.get(related, 0) + 1

            # Bonus: +2 if related is in a red_flag_combo with current symptom
            for combo in cluster.get("red_flag_combinations", []):
                for member in combo:
                    if member not in normalised_set:
                        score_map[member] = score_map.get(member, 0) + 2

        # Co-occurrence bonus: +3 if related appears in multiple current clusters
        co_count: dict[str, int] = {}
        for sym in normalised:
            cluster = self.clusters.get(sym)
            if not cluster:
                continue
            for related in cluster.get("related_symptoms", []):
                co_count[related] = co_count.get(related, 0) + 1

        for sym, count in co_count.items():
            if count >= 2 and sym not in normalised_set:
                score_map[sym] = score_map.get(sym, 0) + 3

        # Build suggestion list
        suggestions: list[dict] = []
        for sym, score in score_map.items():
            if sym in normalised_set:
                continue
            # Determine urgency for this suggested symptom
            related_cluster = self.clusters.get(sym)
            urgency = related_cluster["urgency_hint"] if related_cluster else "low"

            # Build a readable reason
            reason_parts = []
            for current_sym in normalised:
                c = self.clusters.get(current_sym)
                if c and sym in c.get("related_symptoms", []):
                    reason_parts.append(current_sym)

            reason = (
                f"Common with {reason_parts[0]}"
                if reason_parts
                else "Related clinical finding"
            )

            suggestions.append({
                "symptom": sym,
                "reason": reason,
                "score": score,
                "urgency": urgency,
            })

        suggestions.sort(key=lambda x: -x["score"])
        return suggestions, questions

    def _compute_urgency(self, normalised: list[str]) -> str:
        """Return the highest urgency level across all current symptoms."""
        best = "low"
        best_rank = 1
        for sym in normalised:
            cluster = self.clusters.get(sym)
            if not cluster:
                continue
            hint = cluster.get("urgency_hint", "low")
            rank = self.URGENCY_RANK.get(hint, 1)
            if rank > best_rank:
                best_rank = rank
                best = hint
        return best

    def _detect_red_flags(self, normalised: list[str], normalised_set: set[str]) -> list[dict]:
        """
        Check whether any red_flag_combination is a subset of current symptoms.
        Returns list of matched flag objects.
        """
        flags: list[dict] = []
        seen_combos: set[tuple] = set()

        for sym in normalised:
            cluster = self.clusters.get(sym)
            if not cluster:
                continue
            for combo in cluster.get("red_flag_combinations", []):
                combo_key = tuple(sorted(combo))
                if combo_key in seen_combos:
                    continue
                # Check if all combo members are in current symptom set
                if all(member in normalised_set for member in combo):
                    seen_combos.add(combo_key)
                    flags.append({
                        "combination": combo,
                        "warning": self._build_flag_warning(combo, sym),
                    })

        return flags

    def _build_flag_warning(self, combo: list[str], context_symptom: str) -> str:
        """Generate a human-readable clinical flag message."""
        combo_str = " + ".join(c.title() for c in combo)
        cluster = self.clusters.get(context_symptom, {})
        urgency = cluster.get("urgency_hint", "medium")
        clinical_ctx = cluster.get("clinical_context", "clinical")

        if urgency == "critical":
            prefix = "⚠️ CRITICAL"
        elif urgency == "high":
            prefix = "⚠️ HIGH PRIORITY"
        else:
            prefix = "⚠️ CLINICAL ALERT"

        return (
            f"{prefix}: {combo_str} detected. "
            f"Possible {clinical_ctx.upper()} emergency. "
            f"Immediate clinical review recommended."
        )


# Module-level singleton — instantiated once at import time for speed
symptom_suggester = SymptomSuggester()
