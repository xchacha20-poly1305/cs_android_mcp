# Live license validation

This run connected the compiled MCP server over stdio to the real Android Code Search backend at `grimoireoss-pa.clients6.google.com`.

Run: 2026-09-14T07:52:04.928Z to 2026-09-14T07:52:27.491Z. All **27 live tests passed**: 19 file samples and 8 search scenarios, making 92 MCP data requests. The offline suite also passed all 30 tests after the fixes.

## Reproduce

```sh
npm ci
npm run test:live
```

To save a fresh JSON report:

```sh
CS_ANDROID_LIVE_REPORT=/tmp/cs-android-live-results.json npm run test:live
```

[Exact queries, branches, paths, and expectations](cases.json) are defined in the sample configuration. They track named upstream branches; source changes can require updating the sample expectations. The [recorded JSON results](results-2026-09-14.json) include original SHA-256 hashes, resource URIs, MIME types, omission ranges, and timings.

## File tools and resources

Every sample was read through `get_file_content` and `resources/read`, each with default compaction and with `includeLicense=true`. The tests verify matching tool/resource bodies, exact original content in both original modes, unchanged text outside the declared omission ranges, and matching original byte size and MIME metadata.

The samples cover Java, Kotlin, XML, Python, shell, C, C/C++ headers, and plain license documents. Counts below are source characters, not tokenizer estimates.

| Sample | Content | Returned MIME type | Original characters | Displayed characters | Expected behavior |
|---|---|---|---:|---:|---|
| [apache-java](https://cs.android.com/android-studio/platform/tools/base/+/mirror-goog-studio-main:fakeandroid/srcs/android/app/Activity.java) | Apache-2.0 | text/x-java | 1898 | 1323 | Omit lines 1-15 |
| [apache-kotlin](https://cs.android.com/android-studio/platform/tools/adt/idea/+/mirror-goog-studio-main:rendering/src/com/android/tools/rendering/RenderingBundle.kt) | Apache-2.0 | text/plain | 1738 | 1163 | Omit lines 1-15 |
| [apache-xml](https://cs.android.com/android/platform/superproject/+/android-latest-release:frameworks/base/core/res/res/layout/simple_list_item_1.xml) | Apache-2.0 | text/plain | 1177 | 587 | Omit lines 2-15 |
| [apache-python](https://cs.android.com/android/platform/superproject/+/android-latest-release:build/make/tools/check_elf_file.py) | Apache-2.0 | text/x-python | 19711 | 19154 | Omit lines 2-15 |
| [apache-shell](https://cs.android.com/android/platform/superproject/+/android-latest-release:build/make/envsetup.sh) | Apache-2.0 | text/plain | 38355 | 37800 | Omit lines 1-13 |
| [mit-document](https://cs.android.com/android/platform/superproject/+/android-latest-release:external/armnn/LICENSE) | MIT | text/plain | 1069 | 38 | Omit lines 1-21 |
| [bsd-c](https://cs.android.com/android/platform/superproject/+/android-latest-release:bionic/libc/arch-arm/bionic/exidx_static.c) | BSD | text/x-csrc | 2153 | 793 | Omit lines 1-27 |
| [bsd-header](https://cs.android.com/android/platform/superproject/+/android-latest-release:bionic/libc/include/bits/fortify/string.h) | BSD | text/x-chdr | 10828 | 9468 | Omit lines 1-27 |
| [isc-document](https://cs.android.com/android/platform/superproject/+/android-latest-release:external/licenseclassifier/v2/assets/License/ISC/license.txt) | ISC | text/plain | 684 | 39 | Omit lines 1-11 |
| [gpl-document](https://cs.android.com/android/platform/superproject/+/android-latest-release:external/licenseclassifier/v2/assets/License/GPL-3.0/license.txt) | GPL | text/plain | 32472 | 39 | Omit lines 1-621 |
| [lgpl-document](https://cs.android.com/android/platform/superproject/+/android-latest-release:external/licenseclassifier/v2/assets/License/LGPL-2.1/license.txt) | LGPL | text/plain | 24426 | 40 | Omit lines 1-457 |
| [agpl-document](https://cs.android.com/android/platform/superproject/+/android-latest-release:external/licenseclassifier/v2/assets/License/AGPL-3.0/license.txt) | AGPL | text/plain | 32386 | 40 | Omit lines 1-619 |
| [mpl-document](https://cs.android.com/android/platform/superproject/+/android-latest-release:external/eigen/COPYING.MPL2) | MPL-2.0 | text/plain | 16726 | 43 | Omit lines 1-373 |
| [mpl-short-header](https://cs.android.com/android/platform/superproject/+/android-latest-release:external/eigen/Eigen/src/Core/util/Macros.h) | MPL short notice | text/x-chdr | 52909 | 52909 | Preserve original |
| [unlicense-document](https://cs.android.com/android/platform/superproject/+/android-latest-release:external/licenseclassifier/v2/assets/License/Unlicense/license.txt) | Unlicense | text/plain | 1213 | 45 | Omit lines 1-23 |
| [unknown-cecill](https://cs.android.com/android/platform/superproject/+/android-latest-release:external/licenseclassifier/v2/assets/License/CECILL-2.1/license.txt) | Unknown CeCILL | text/plain | 21341 | 21341 | Preserve original |
| [mixed-document](https://cs.android.com/android/platform/superproject/+/android-latest-release:external/coreboot/LICENSE) | License inventory | text/plain | 237476 | 237476 | Preserve original |
| [short-spdx](https://cs.android.com/android/kernel/superproject/+/common-android-mainline:common/kernel/bounds.c) | Short SPDX notice | text/x-csrc | 974 | 974 | Preserve original |
| [mixed-lgpl-header](https://cs.android.com/android/kernel/superproject/+/common-android-mainline:common/certs/extract-cert.c) | LGPL with documentation | text/x-csrc | 4293 | 4293 | Preserve original |

Unknown licenses, multi-license inventories, short SPDX/MPL notices, and comments mixing documentation with licensing are deliberately retained in these samples.

## Search responses

Both modes are checked against each other. Tests verify that source snippets actually exist, blank lines never render as `undefined`, omitted ranges match original line numbers, and every displayed line outside an omission is unchanged.

One explicit case allows file matches without snippets: the backend returned that shape for the broad GPL query with 80 context lines. That case verifies unchanged file metadata; it is not counted as evidence of license snippet compaction. The separate GPL version query returned a real 22-line preamble and exercised compaction.

| Scenario | Returned content | Original response characters | Displayed response characters | Omissions |
|---|---|---:|---:|---:|
| search-apache | Source lines | 1292 | 669 | 1 |
| search-mit-blank-lines | Source lines | 1855 | 752 | 1 |
| search-gpl | Source lines | 1458 | 406 | 1 |
| search-mpl-blank-lines | Source lines | 2076 | 1328 | 1 |
| search-unknown-cecill | Source lines | 1275 | 1275 | 0 |
| search-short-spdx | Source lines | 379 | 379 | 0 |
| search-code-lines | Source lines | 760 | 760 | 0 |
| search-files-without-snippets | File matches only | 357 | 357 | 0 |

## Issues found and fixed by the live run

- Blank search lines omit the protobuf `lineText` field. The API client now normalizes it to an empty string, preventing both `undefined` output and crashes during compaction.
- CeCILL and the coreboot license inventory were being labeled as a referenced license. Classification now prefers a document's own title or opening grant and preserves unknown or ambiguous documents.
- `COPYING.MPL2` was missed by the filename rules. Versioned license names are now supported, and the MPL document title takes precedence over its references to GNU licenses.
- The GPL preamble lacked the terms matched by the original rule. Recognition now includes the actual permission to copy the license document, covering the real search excerpt.

Captured source excerpts for classification regressions are stored in [the upstream fixtures](../fixtures/upstream/license-documents.json), with source links and excerpt ranges.
