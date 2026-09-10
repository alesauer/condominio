"""Tests for the pagination utility."""
from unittest.mock import AsyncMock, MagicMock
import pytest
from sqlalchemy import select, func

from app.utils.pagination import paginate


class TestPaginate:
    async def test_empty_result(self, mock_db):
        """Page through an empty table."""
        # Mock count query -> 0
        count_result = MagicMock()
        count_result.scalar.return_value = 0

        # Mock data query -> empty
        data_result = MagicMock()
        data_result.scalars.return_value.all.return_value = []

        mock_db.execute = AsyncMock()
        mock_db.execute.side_effect = [count_result, data_result]

        query = select()
        result = await paginate(mock_db, query, page=1, page_size=20)

        assert result["items"] == []
        assert result["total"] == 0
        assert result["page"] == 1
        assert result["page_size"] == 20
        assert result["total_pages"] == 0

    async def test_single_page(self, mock_db):
        """Results fit in one page."""
        count_result = MagicMock()
        count_result.scalar.return_value = 3

        data_result = MagicMock()
        data_result.scalars.return_value.all.return_value = ["a", "b", "c"]

        mock_db.execute = AsyncMock()
        mock_db.execute.side_effect = [count_result, data_result]

        result = await paginate(mock_db, select(), page=1, page_size=20)
        assert result["total"] == 3
        assert len(result["items"]) == 3
        assert result["total_pages"] == 1

    async def test_multiple_pages(self, mock_db):
        """Total > page_size, check total_pages calculation."""
        count_result = MagicMock()
        count_result.scalar.return_value = 25

        data_result = MagicMock()
        data_result.scalars.return_value.all.return_value = list(range(10))

        mock_db.execute = AsyncMock()
        mock_db.execute.side_effect = [count_result, data_result]

        result = await paginate(mock_db, select(), page=1, page_size=10)
        assert result["total"] == 25
        assert result["total_pages"] == 3
        assert result["page"] == 1

    async def test_last_page(self, mock_db):
        """Page 3 of 25 items with page_size 10 -> 5 items."""
        count_result = MagicMock()
        count_result.scalar.return_value = 25

        data_result = MagicMock()
        data_result.scalars.return_value.all.return_value = list(range(5))

        mock_db.execute = AsyncMock()
        mock_db.execute.side_effect = [count_result, data_result]

        result = await paginate(mock_db, select(), page=3, page_size=10)
        assert len(result["items"]) == 5
        assert result["page"] == 3
        assert result["total_pages"] == 3
