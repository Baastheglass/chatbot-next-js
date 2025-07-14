#!/usr/bin/env python3
"""Test script to verify URL encoding/decoding of system prompt"""

import urllib.parse

# This is a sample system prompt with newlines like the one causing the issue
test_prompt = """You are a business advisor for ai powered applications/tools.
Overview:
I want to build an ai-powered SAAS targeted towards businesses that want to understand how ai can help solve the businesses challenges."""

print("Original prompt:")
print(repr(test_prompt))
print("\nOriginal prompt:")
print(test_prompt)

# Encode it (like the frontend does)
encoded = urllib.parse.quote(test_prompt)
print(f"\nEncoded prompt:")
print(repr(encoded))

# Decode it (like the backend should do)
decoded = urllib.parse.unquote(encoded)
print(f"\nDecoded prompt:")
print(repr(decoded))
print("\nDecoded prompt:")
print(decoded)

# Verify they match
print(f"\nOriginal == Decoded: {test_prompt == decoded}")
