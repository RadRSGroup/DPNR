#!/usr/bin/env python3
"""Render page(s) of the reference PDF to PNG via PyMuPDF.

poppler/pdftoppm isn't installed on this machine, so the Read tool's built-in
PDF-page rendering fails outright with "pdftoppm is not installed." PyMuPDF
(the `fitz` module) works directly and needs no external binary.

Usage:
    python3 render_pages.py <pdf_path> <output_dir> [--pages 1-4] [--scale 1.5]

Both paths must be Windows-style (C:\\Users\\...), not Git-Bash POSIX style
(/c/Users/...) — a POSIX path fails with a bare FileNotFoundError even though
the file visibly exists when you `ls` it from bash.
"""
import argparse

import fitz  # PyMuPDF


def parse_pages(spec, total):
    if not spec:
        return range(total)
    start, _, end = spec.partition('-')
    start_idx = int(start) - 1
    end_idx = int(end) - 1 if end else start_idx
    return range(start_idx, end_idx + 1)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('pdf_path', help='Windows-style path to the reference PDF')
    parser.add_argument('output_dir', help='Windows-style path to write PNGs into')
    parser.add_argument('--pages', help='1-indexed page or range, e.g. "1" or "3-5". Omit for all pages.')
    parser.add_argument('--scale', type=float, default=1.5, help='Render scale (1.5 is a good default for on-screen comparison)')
    args = parser.parse_args()

    doc = fitz.open(args.pdf_path)
    print(f'{len(doc)} page(s) in {args.pdf_path}')
    for i in parse_pages(args.pages, len(doc)):
        page = doc.load_page(i)
        pix = page.get_pixmap(matrix=fitz.Matrix(args.scale, args.scale))
        out_path = f'{args.output_dir}\\page{i + 1}.png'
        pix.save(out_path)
        print(out_path)


if __name__ == '__main__':
    main()
