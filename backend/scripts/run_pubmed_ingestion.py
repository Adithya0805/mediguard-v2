import argparse
import asyncio
import sys
import os

# Adjust path to import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.rag.pubmed_ingestion import PubMedIngestionPipeline
from app.data.pubmed_search_queries import PUBMED_SEARCH_QUERIES
from app.utils.logger import get_logger

logger = get_logger("scripts.run_pubmed_ingestion")


async def main():
    parser = argparse.ArgumentParser(description="MediGuard V2 PubMed Knowledge Ingestion CLI Runner")
    parser.add_argument("--quick", action="store_true", help="Ingest only 1 article for the first 3 cardiorespiratory topics")
    parser.add_argument("--priority", action="store_true", help="Ingest all high and critical priority topics")
    parser.add_argument("--full", action="store_true", help="Ingest all configured topics")
    parser.add_argument("--topic", type=str, default=None, help="Ingest only a specific topic name")
    parser.add_argument("--max-results", type=int, default=5, help="Cap search results per topic (default: 5)")
    
    args = parser.parse_args()
    
    pipeline = PubMedIngestionPipeline()
    
    # Resolve selected topics
    selected_topics = []
    max_results = args.max_results
    
    if args.quick:
        # Fetch first 3 cardiorespiratory topics: cardiac_arrest, acute_coronary_syndrome, heart_failure
        quick_topic_names = ["cardiac_arrest", "acute_coronary_syndrome", "heart_failure"]
        selected_topics = [t for t in PUBMED_SEARCH_QUERIES if t["topic"] in quick_topic_names]
        max_results = 1
        print("[QUICK MODE] ACTIVE (1 article per cardiovascular topic, max 3 total)")
    elif args.topic:
        selected_topics = [t for t in PUBMED_SEARCH_QUERIES if t["topic"] == args.topic]
        if not selected_topics:
            print(f"[ERROR] Topic '{args.topic}' not found in PUBMED_SEARCH_QUERIES database.")
            sys.exit(1)
        print(f"[SINGLE TOPIC] Ingesting '{args.topic}'")
    elif args.priority:
        selected_topics = [t for t in PUBMED_SEARCH_QUERIES if t.get("priority") in ["high", "critical"]]
        print(f"[PRIORITY MODE] Ingesting {len(selected_topics)} high/critical priority topics")
    elif args.full:
        selected_topics = PUBMED_SEARCH_QUERIES
        print(f"[FULL MODE] Ingesting all {len(selected_topics)} medical literature topics")
    else:
        parser.print_help()
        sys.exit(0)
        
    print(f"Selected {len(selected_topics)} topics to ingest: {[t['topic'] for t in selected_topics]}")
    print("-" * 60)
    
    total_upserted = 0
    start_time = asyncio.get_event_loop().time()
    
    try:
        for idx, topic_config in enumerate(selected_topics, 1):
            topic_name = topic_config["topic"]
            print(f"[{idx}/{len(selected_topics)}] Starting ingestion for topic: {topic_name}")
            try:
                upserted_count = await pipeline.ingest_topic(topic_config, max_results=max_results)
                total_upserted += upserted_count
                print(f"[SUCCESS] Completed topic '{topic_name}': Upserted {upserted_count} chunks.")
            except Exception as e:
                print(f"[ERROR] Failed to ingest topic '{topic_name}': {str(e)}")
            
            # Enforce 1.0 second delay between topics to prevent NCBI rate limit penalties
            if idx < len(selected_topics):
                print("Sleeping for 1.0 second between topics to avoid rate limits...")
                await asyncio.sleep(1.0)
                
        duration = asyncio.get_event_loop().time() - start_time
        print("=" * 60)
        print(f"[FINISHED] INGESTION PIPELINE COMPLETED")
        print(f"   Total Chunks Upserted: {total_upserted}")
        print(f"   Duration: {duration:.2f} seconds")
        print("=" * 60)
        
    finally:
        # Clean up client resources
        from app.services.pubmed_client import pubmed_client
        await pubmed_client.close()


if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
