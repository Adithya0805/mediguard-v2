from typing import Dict, Any, List
from supabase import Client, create_client
from app.config import settings
from app.utils.logger import get_logger
from app.utils.exceptions import DatabaseConnectionException, DatabaseException


logger = get_logger("app.db.supabase_client")

# In-memory storage mock database for offline-first testing and local verification
_mock_db: Dict[str, List[Dict[str, Any]]] = {
    "patient_sessions": [],
    "agent_runs": [],
    "clinical_reports": [],
    "audit_logs": [],
    "institutions": [],
    "clinical_staff": [],
    "auth_sessions": [],
    "auth_audit_log": []
}


class MockSupabaseQueryBuilder:
    """Mock query builder mirroring Supabase's PostgrestQueryBuilder syntax."""
    
    def __init__(self, table_name: str):
        self.table_name = table_name
        self.filters = []
        self.insert_data = None
        self.update_data = None
        self.order_by = None
        self.range_bounds = None

    def insert(self, data: Any):
        self.insert_data = data
        return self

    def select(self, fields: str = "*"):
        return self

    def update(self, data: Dict[str, Any]):
        self.update_data = data
        return self

    def eq(self, field: str, value: Any):
        self.filters.append((field, value))
        return self

    def order(self, field: str, desc: bool = False):
        self.order_by = (field, desc)
        return self

    def range(self, start: int, end: int):
        self.range_bounds = (start, end)
        return self

    def limit(self, count: int):
        return self

    def execute(self):
        """Simulates PostgreSQL query execution over our in-memory _mock_db store."""
        class MockResponse:
            def __init__(self, data: List[Dict[str, Any]]):
                self.data = data
                
        # 1. Handle Insertion
        if self.insert_data is not None:
            records = self.insert_data if isinstance(self.insert_data, list) else [self.insert_data]
            inserted_records = []
            for rec in records:
                # Store a copy to avoid mutation reference side effects
                record_copy = dict(rec)
                if "id" not in record_copy:
                    import uuid
                    record_copy["id"] = str(uuid.uuid4())
                if "created_at" not in record_copy:
                    from datetime import datetime
                    record_copy["created_at"] = datetime.utcnow().isoformat()
                if "is_active" not in record_copy:
                    record_copy["is_active"] = True
                _mock_db[self.table_name].append(record_copy)
                inserted_records.append(record_copy)
            return MockResponse(inserted_records)
            
        # 2. Retrieve Table
        db_table = _mock_db.get(self.table_name, [])
        filtered_records = list(db_table)
        
        # 3. Handle Filters
        for field, val in self.filters:
            filtered_records = [r for r in filtered_records if str(r.get(field)).strip().lower() == str(val).strip().lower()]
            
        # 4. Handle Update
        if self.update_data is not None:
            for rec in filtered_records:
                rec.update(self.update_data)
            return MockResponse(filtered_records)
            
        # 5. Handle Ordering
        if self.order_by:
            field, desc = self.order_by
            filtered_records.sort(key=lambda x: x.get(field, ""), reverse=desc)
            
        # 6. Handle Range/Pagination
        if self.range_bounds:
            start, end = self.range_bounds
            filtered_records = filtered_records[start : end + 1]
            
        return MockResponse(filtered_records)


class MockSupabaseClient:
    """Mock Supabase client providing PostgreSQL syntax fallbacks offline."""
    
    def table(self, table_name: str) -> MockSupabaseQueryBuilder:
        return MockSupabaseQueryBuilder(table_name)


# Singleton caching
_supabase_client = None


def get_supabase_client() -> Client:
    """Returns the singleton client instance, switching to MockSupabaseClient if mock keys are present."""
    global _supabase_client
    
    if _supabase_client is not None:
        return _supabase_client
        
    try:
        url = settings.SUPABASE_URL
        key = settings.SUPABASE_SERVICE_KEY or settings.SUPABASE_ANON_KEY
        
        # Deploy MockSupabaseClient if mock credentials are set
        if not url or "your-project" in url or "mock" in url:
            logger.info("Supabase credentials are mock. Activating offline-first MockSupabaseClient.")
            _supabase_client = MockSupabaseClient()
            return _supabase_client
            
        _supabase_client = create_client(url, key)
        logger.info("Supabase singleton client established successfully.", url=url)
        return _supabase_client
        
    except Exception as e:
        logger.error("Failed to establish Supabase connection", error=str(e))
        raise DatabaseConnectionException(f"Failed to connect to Supabase: {str(e)}")


async def upload_pdf_to_storage(
    pdf_bytes: bytes,
    session_id: str
) -> str:
    """Uploads compiled PDF report bytes to Supabase Storage."""
    client = get_supabase_client()
    
    if isinstance(client, MockSupabaseClient):
        mock_url = f"https://mock-storage.supabase.co/clinical-reports/reports/{session_id}/clinical_report.pdf"
        logger.info("Mock PDF uploaded successfully (in-memory mock mode)", path=f"reports/{session_id}/clinical_report.pdf", size_bytes=len(pdf_bytes), url=mock_url)
        return mock_url
        
    try:
        # Check/create bucket
        try:
            client.storage.create_bucket("clinical-reports", options={"public": True})
        except Exception:
            pass  # Already exists or standard postgrest error we ignore
            
        path = f"reports/{session_id}/clinical_report.pdf"
        # Standard Supabase python SDK storage calls are synchronous
        client.storage.from_("clinical-reports").upload(
            path=path,
            file=pdf_bytes,
            file_options={"content-type": "application/pdf"}
        )
        public_url = client.storage.from_("clinical-reports").get_public_url(path)
        logger.info("Clinical report PDF successfully uploaded to Supabase Storage", path=path, size_bytes=len(pdf_bytes), url=public_url)
        return public_url
    except Exception as e:
        logger.error("Failed to upload report PDF to Supabase Storage bucket", session_id=session_id, error=str(e))
        raise DatabaseException(f"Failed to upload report PDF: {str(e)}")


async def get_pdf_url(session_id: str) -> str | None:
    """Retrieves public PDF report storage url link for an existing patient session."""
    client = get_supabase_client()
    
    if isinstance(client, MockSupabaseClient):
        # Scan mock clinical reports table
        reports = _mock_db.get("clinical_reports", [])
        for r in reports:
            if str(r.get("session_id")) == str(session_id):
                return r.get("report_pdf_url")
        return None
        
    try:
        response = client.table("clinical_reports").select("report_pdf_url").eq("session_id", str(session_id)).execute()
        if response.data and response.data[0].get("report_pdf_url"):
            return response.data[0]["report_pdf_url"]
        return None
    except Exception as e:
        logger.error("Failed to query report PDF url from clinical_reports table", session_id=session_id, error=str(e))
        return None

