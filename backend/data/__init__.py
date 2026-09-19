"""
Road data package initialization.
"""
from .mock_road_network import (
    MOCK_ROAD_NETWORK,
    get_all_segments,
    get_segments_by_road,
    get_segment_by_id
)

__all__ = [
    "MOCK_ROAD_NETWORK",
    "get_all_segments",
    "get_segments_by_road",
    "get_segment_by_id"
]
