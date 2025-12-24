#!/usr/bin/env python3
"""
Smart Path Detection Engine
Uses file fingerprinting to detect actual folder paths from browser-selected files.
"""

import os
import pwd
import time
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
import logging

logger = logging.getLogger(__name__)

class PathDetector:
    def __init__(self):
        self.common_directories = self._get_common_directories()
        self.confidence_threshold = 0.3  # Minimum confidence to consider a match

    def _get_common_directories(self) -> List[str]:
        """Get list of common user directories to search."""
        try:
            current_user = pwd.getpwuid(os.getuid()).pw_name
        except:
            current_user = os.getenv('USER', 'barbarossia')

        directories = [
            f"/Users/{current_user}",
            "/Users/barbarossia",  # Fallback
            os.path.expanduser("~"),
            "/tmp"
        ]

        # Add common subdirectories
        subdirs = ["Pictures", "Desktop", "Downloads", "Documents", "Movies"]
        extended_dirs = []

        for base_dir in directories:
            for subdir in subdirs:
                extended_dirs.append(os.path.join(base_dir, subdir))

        return directories + extended_dirs

    def detect_folder_path(self, fingerprints: List[Dict], folder_name: str, webkit_path: str = '') -> List[Dict[str, Any]]:
        """
        Detect the actual folder path from file fingerprints.

        Args:
            fingerprints: List of file fingerprints from browser
            folder_name: Name of the selected folder
            webkit_path: Optional webkitRelativePath for better path reconstruction

        Returns:
            List of detected paths with confidence scores, sorted by confidence
        """
        detected_paths = []

        # Strategy 1: Enhanced webkit path reconstruction
        if webkit_path:
            webkit_matches = self._reconstruct_from_webkit_path(webkit_path, folder_name)
            detected_paths.extend(webkit_matches)

        # Strategy 2: Direct folder name search in common directories
        direct_matches = self._search_direct_folder_matches(folder_name, fingerprints)
        detected_paths.extend(direct_matches)

        # Strategy 3: File-by-file matching
        file_matches = self._search_by_file_matching(fingerprints)
        detected_paths.extend(file_matches)

        # Strategy 4: Basic WebkitRelativePath pattern analysis (fallback)
        if fingerprints and fingerprints[0].get('webkitRelativePath'):
            path_matches = self._analyze_webkit_path(fingerprints[0]['webkitRelativePath'])
            detected_paths.extend(path_matches)

        # Sort by confidence and remove duplicates
        detected_paths = self._sort_and_deduplicate_paths(detected_paths)

        # Limit to top 5 results
        return detected_paths[:5]

    def _search_direct_folder_matches(self, folder_name: str, fingerprints: List[Dict]) -> List[Dict[str, Any]]:
        """Search for folders with the exact name in common directories."""
        matches = []

        for base_dir in self.common_directories:
            if not os.path.exists(base_dir):
                continue

            try:
                # Look for folder with exact name
                for item in os.listdir(base_dir):
                    item_path = os.path.join(base_dir, item)

                    if os.path.isdir(item_path) and item == folder_name:
                        confidence = self._calculate_confidence(item_path, fingerprints)

                        if confidence > self.confidence_threshold:
                            matches.append({
                                'path': item_path,
                                'confidence': confidence,
                                'matched_files': self._count_matching_files(item_path, fingerprints),
                                'method': 'direct_folder_match'
                            })
            except (OSError, PermissionError):
                continue

        return matches

    def _search_by_file_matching(self, fingerprints: List[Dict]) -> List[Dict[str, Any]]:
        """Search for folders by matching individual files."""
        matches = {}

        for fingerprint in fingerprints[:5]:  # Limit to 5 files for performance
            file_matches = self._find_file_by_fingerprint(fingerprint)

            for file_path in file_matches:
                folder_path = str(Path(file_path).parent)

                if folder_path not in matches:
                    matches[folder_path] = {
                        'path': folder_path,
                        'confidence': 0,
                        'matched_files': 0,
                        'method': 'file_matching'
                    }

                matches[folder_path]['matched_files'] += 1

        # Calculate final confidence for each match
        for folder_path, match_info in matches.items():
            match_info['confidence'] = self._calculate_confidence(folder_path, fingerprints)

            if match_info['confidence'] > self.confidence_threshold:
                matches[folder_path] = match_info
            else:
                del matches[folder_path]

        return list(matches.values())

    def _find_file_by_fingerprint(self, fingerprint: Dict) -> List[str]:
        """Find files matching a specific fingerprint."""
        matches = []
        file_name = fingerprint.get('name')
        file_size = fingerprint.get('size')

        if not file_name:
            return matches

        # Search in common directories
        for base_dir in self.common_directories:
            if not os.path.exists(base_dir):
                continue

            try:
                for root, dirs, files in os.walk(base_dir):
                    # Limit depth to avoid performance issues
                    level = root.replace(base_dir, '').count(os.sep)
                    if level >= 3:
                        dirs[:] = []  # Don't recurse further
                        continue

                    for file in files:
                        if file == file_name:
                            file_path = os.path.join(root, file)

                            try:
                                file_stat = os.stat(file_path)
                                if file_stat.st_size == file_size:
                                    # Additional check: compare modification time if available
                                    if abs(file_stat.st_mtime - fingerprint.get('lastModified', 0) / 1000) < 3600:
                                        matches.append(file_path)
                                    else:
                                        matches.append(file_path)  # Still consider without time match
                            except (OSError, PermissionError):
                                continue
            except (OSError, PermissionError):
                continue

        return matches

    def _analyze_webkit_path(self, webkit_path: str) -> List[Dict[str, Any]]:
        """Analyze webkitRelativePath for path clues."""
        matches = []

        # Look for path patterns that might reveal the location
        path_parts = webkit_path.split('/')

        # Try to reconstruct path from pattern
        try:
            if 'Users' in path_parts:
                users_index = path_parts.index('Users')
                if users_index + 2 < len(path_parts):
                    reconstructed_path = '/' + '/'.join(path_parts[:users_index + 3])

                    if os.path.exists(reconstructed_path) and os.path.isdir(reconstructed_path):
                        matches.append({
                            'path': reconstructed_path,
                            'confidence': 0.8,  # High confidence for path reconstruction
                            'matched_files': 1,
                            'method': 'webkit_path_analysis'
                        })
        except (IndexError, OSError):
            pass

        return matches

    def _calculate_confidence(self, folder_path: str, fingerprints: List[Dict]) -> float:
        """Calculate confidence score for a folder path."""
        if not fingerprints or not os.path.exists(folder_path):
            return 0.0

        try:
            # Count matching files
            matched_count = 0
            total_count = len(fingerprints)

            folder_files = set()
            try:
                for item in os.listdir(folder_path):
                    item_path = os.path.join(folder_path, item)
                    if os.path.isfile(item_path):
                        try:
                            stat = os.stat(item_path)
                            folder_files.add((item, stat.st_size))
                        except (OSError, PermissionError):
                            continue
            except (OSError, PermissionError):
                return 0.0

            for fingerprint in fingerprints:
                file_name = fingerprint.get('name')
                file_size = fingerprint.get('size')

                if (file_name, file_size) in folder_files:
                    matched_count += 1

            # Calculate confidence based on match ratio
            base_confidence = matched_count / total_count

            # Boost confidence for well-known directories
            path_boost = 0.0
            if '/Users/' in folder_path and any(x in folder_path for x in ['/Pictures', '/Desktop', '/Downloads']):
                path_boost = 0.2

            confidence = min(1.0, base_confidence + path_boost)

            return confidence

        except Exception as e:
            logger.warning(f"Error calculating confidence for {folder_path}: {e}")
            return 0.0

    def _count_matching_files(self, folder_path: str, fingerprints: List[Dict]) -> int:
        """Count how many fingerprints match files in the folder."""
        if not os.path.exists(folder_path):
            return 0

        try:
            matched = 0
            folder_files = {}

            for item in os.listdir(folder_path):
                if os.path.isfile(os.path.join(folder_path, item)):
                    try:
                        stat = os.stat(os.path.join(folder_path, item))
                        folder_files[item] = stat.st_size
                    except (OSError, PermissionError):
                        continue

            for fingerprint in fingerprints:
                file_name = fingerprint.get('name')
                file_size = fingerprint.get('size')

                if folder_files.get(file_name) == file_size:
                    matched += 1

            return matched

        except (OSError, PermissionError):
            return 0

    def _reconstruct_from_webkit_path(self, webkit_path: str, folder_name: str) -> List[Dict[str, Any]]:
        """Enhanced webkit path reconstruction that preserves full folder structure."""
        matches = []

        path_parts = webkit_path.split('/')
        logger.info(f"Analyzing webkit path: {webkit_path}")
        logger.info(f"Path parts: {path_parts}")

        # Find the target folder in the path
        folder_indices = [i for i, part in enumerate(path_parts) if part == folder_name]

        for folder_index in folder_indices:
            # Extract the folder structure up to and including the target folder
            folder_structure = path_parts[:folder_index + 1]

            # Try different base directories
            for base_dir in self.common_directories:
                if not os.path.exists(base_dir):
                    continue

                # Method 1: Direct reconstruction
                candidate_path = os.path.join(base_dir, *folder_structure)

                if os.path.exists(candidate_path) and os.path.isdir(candidate_path):
                    confidence = self._calculate_confidence(candidate_path, [])

                    if confidence > self.confidence_threshold:
                        matches.append({
                            'path': candidate_path,
                            'confidence': max(0.8, confidence),  # High confidence for direct reconstruction
                            'matched_files': 1,
                            'method': 'webkit_reconstruction'
                        })

                # Method 2: Try with user directory prefix
                if 'Users' in folder_structure:
                    users_index = folder_structure.index('Users')
                    if users_index + 1 < len(folder_structure):
                        username = folder_structure[users_index + 1]
                        candidate_path = f"/Users/{username}/" + "/".join(folder_structure[users_index + 2:])

                        if os.path.exists(candidate_path) and os.path.isdir(candidate_path):
                            confidence = self._calculate_confidence(candidate_path, [])
                            if confidence > self.confidence_threshold:
                                matches.append({
                                    'path': candidate_path,
                                    'confidence': max(0.8, confidence),
                                    'matched_files': 1,
                                    'method': 'webkit_user_reconstruction'
                                })

            # Method 3: Try exact path reconstruction from webkit structure
            # This handles cases like Downloads/continue/ESObIvXrKZI
            if len(folder_structure) >= 2:
                # Try with common base prefixes
                base_prefixes = [
                    f"/Users/{self._get_current_user()}/",
                    f"/Users/{self._get_current_user()}/Downloads/",
                    f"/Users/{self._get_current_user()}/Desktop/",
                    f"/Users/{self._get_current_user()}/Documents/",
                ]

                for prefix in base_prefixes:
                    # Try the exact structure from webkit path
                    candidate_path = prefix + "/".join(folder_structure)

                    if os.path.exists(candidate_path) and os.path.isdir(candidate_path):
                        confidence = self._calculate_confidence(candidate_path, [])
                        if confidence > self.confidence_threshold:
                            matches.append({
                                'path': candidate_path,
                                'confidence': max(0.75, confidence),
                                'matched_files': 1,
                                'method': 'webkit_exact_reconstruction'
                            })

        return matches

    def _get_current_user(self) -> str:
        """Get current username."""
        try:
            return pwd.getpwuid(os.getuid()).pw_name
        except:
            return os.getenv('USER', 'barbarossia')

    def _sort_and_deduplicate_paths(self, paths: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Sort paths by confidence and remove duplicates."""
        if not paths:
            return []

        # Sort by confidence descending
        paths.sort(key=lambda x: x['confidence'], reverse=True)

        # Remove duplicates (same path)
        seen_paths = set()
        unique_paths = []

        for path_info in paths:
            if path_info['path'] not in seen_paths:
                seen_paths.add(path_info['path'])
                unique_paths.append(path_info)

        return unique_paths