import unittest
from pathlib import Path
from runninghub_cli.video_utils import build_crop_filter

class TestVideoUtils(unittest.TestCase):
    def test_build_crop_filter_predefined(self):
        self.assertEqual(build_crop_filter('left'), 'iw/2:ih:0:0')
        self.assertEqual(build_crop_filter('right'), 'iw/2:ih:iw/2:0')
        self.assertEqual(build_crop_filter('center'), 'iw/2:ih:iw/4:0')
        self.assertEqual(build_crop_filter('top'), 'iw:ih/2:0:0')
        self.assertEqual(build_crop_filter('bottom'), 'iw:ih/2:0:ih/2')

    def test_build_crop_filter_custom_pixels(self):
        self.assertEqual(build_crop_filter('custom', width='100', height='200', x='10', y='20'), '100:200:10:20')

    def test_build_crop_filter_custom_percentages(self):
        self.assertEqual(build_crop_filter('custom', width='100%', height='50%', x='0', y='0'), '1.0*iw:0.5*ih:0:0')
        self.assertEqual(build_crop_filter('custom', width='100%', height='50%', x='0', y='50%'), '1.0*iw:0.5*ih:0:0.5*ih')

    def test_build_crop_filter_invalid(self):
        with self.assertRaises(ValueError):
            build_crop_filter('invalid')

if __name__ == '__main__':
    unittest.main()
