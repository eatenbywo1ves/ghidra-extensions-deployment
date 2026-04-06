# CLAUDE.md — AI Assistant Guide for ghidra-extensions-deployment

This file provides context for AI assistants (Claude, Copilot, etc.) working in this repository.

---

## Project Overview

This repository is a **Ghidra extension suite** focused on binary reverse engineering. It contains two extensions:

| Extension | Purpose | Status |
|-----------|---------|--------|
| **CryptoDetect** | Detects cryptographic routines in binaries via pattern matching, entropy analysis, and heuristics | Source available, actively developed |
| **RetSync** | Real-time synchronization between Ghidra and external debuggers (IDA Pro, x64dbg, OllyDbg, WinDbg) | Pre-built binary for Ghidra 10.2 |

Supporting infrastructure includes cross-platform install scripts, a Python verification tool, and a GitHub Actions CI/CD pipeline.

---

## Repository Structure

```
ghidra-extensions-deployment/
├── .github/workflows/
│   └── build-and-release.yml       # CI/CD: multi-platform build, test, release, docs
├── extensions/
│   ├── crypto_detect/
│   │   ├── source/                 # Java source for CryptoDetect
│   │   │   ├── src/main/java/cryptodetect/
│   │   │   │   ├── CryptoDetectPlugin.java          # Plugin entry point
│   │   │   │   ├── analyzers/CryptoRoutineAnalyzer.java  # Core detection engine
│   │   │   │   ├── services/PatternMatchingService.java  # Crypto pattern database
│   │   │   │   └── ui/
│   │   │   │       ├── CryptoDetectProvider.java    # Docking tool window
│   │   │   │       └── CryptoResultsPanel.java      # Results table with navigation
│   │   │   ├── build.gradle                         # Gradle build (Java 17, Ghidra SDK)
│   │   │   ├── build-package.bat                    # Windows: build + zip distribution
│   │   │   ├── extension.properties                 # Extension name/version metadata
│   │   │   ├── Module.manifest                      # Ghidra module dependencies
│   │   │   └── LICENSE                              # MIT
│   │   └── releases/               # Output directory for built .zip packages
│   └── retsync/
│       ├── ghidra_10.2/
│       │   └── extension.properties
│       └── releases/               # Output directory for RetSync packages
├── scripts/
│   ├── install.sh                  # Linux/macOS installer (228 lines)
│   ├── install.bat                 # Windows installer (172 lines)
│   └── verify.py                   # Python 3 verification + checksum tool (297 lines)
├── README.md
└── CLAUDE.md                       # This file
```

---

## CryptoDetect Architecture

### Class Responsibilities

| Class | Package | Role |
|-------|---------|------|
| `CryptoDetectPlugin` | `cryptodetect` | Ghidra plugin lifecycle, service wiring, UI registration |
| `CryptoRoutineAnalyzer` | `cryptodetect.analyzers` | Orchestrates four detection strategies over program memory |
| `PatternMatchingService` | `cryptodetect.services` | Hardcoded byte/string patterns for AES, DES, SHA-1, MD5, RSA |
| `CryptoDetectProvider` | `cryptodetect.ui` | Ghidra `ComponentProvider` (docking panel), toolbar actions |
| `CryptoResultsPanel` | `cryptodetect.ui` | Sortable `JTable` of findings; double-click navigates to address |

### Detection Strategies (in `CryptoRoutineAnalyzer`)

1. **Pattern matching** — byte-level comparison against known crypto constants (via `PatternMatchingService`)
2. **Entropy analysis** — high Shannon entropy signals encrypted/compressed data regions
3. **Instruction sequence analysis** — identifies characteristic instruction patterns (XOR loops, rotations, etc.)
4. **S-box / key schedule detection** — locates known lookup tables embedded in the binary

### Confidence Scoring

Results carry a `double` confidence score in `[0.0, 1.0]`. The `CryptoResultsPanel` color-codes rows by confidence tier. Detection types are expressed as the enum `DetectionType`: `PATTERN_MATCH`, `CONSTANT_MATCH`, `ENTROPY_ANALYSIS`, `STRUCTURE_ANALYSIS`, `HEURISTIC`.

### Background Processing

Analysis runs on an `ExecutorService` thread pool to keep the Ghidra UI responsive. `CryptoDetectProvider` exposes Analyze / Stop / Clear toolbar actions.

### Known Gap

`CryptoAnalysisService` is referenced in `CryptoDetectPlugin` but the implementation does not yet exist in the repository. Do not assume it is importable until it is added.

---

## Build System

### Requirements

- **Java 17+** (Ghidra 12.0 bundles its own JDK)
- **Gradle 7.6+**
- **Ghidra SDK** — set `GHIDRA_INSTALL_DIR` environment variable

### Building CryptoDetect Locally

```bash
cd extensions/crypto_detect/source
export GHIDRA_INSTALL_DIR=/path/to/ghidra_12.0
gradle clean build
```

On Windows, use the provided script which also packages the zip:

```bat
cd extensions\crypto_detect\source
build-package.bat
```

### Test Dependencies (build.gradle)

```groovy
testImplementation 'junit:junit:4.13.2'
testImplementation 'org.mockito:mockito-core:4.11.0'
```

Run tests with `gradle test`. No test source files exist yet — the infrastructure is wired but tests need to be written.

### Ghidra Module Dependencies (Module.manifest)

- `Base`
- `SoftwareModeling`
- `Framework-Plugins`

---

## CI/CD Pipeline (`.github/workflows/build-and-release.yml`)

The pipeline runs on push/PR and covers:

| Stage | Description |
|-------|-------------|
| **Multi-platform build** | Ubuntu, Windows, macOS runners |
| **Multi-version Ghidra** | Ghidra 11.0, 11.1, 12.0 |
| **Test** | Gradle test suite |
| **Package** | Creates `.zip` artifacts per platform/version |
| **Release** | Publishes GitHub Release with artifacts |
| **Docs** | Generates MkDocs site (Material theme, mermaid2 plugin) |

Do not modify the workflow file without understanding which matrix dimensions it uses — changes can silently skip version/platform combinations.

---

## Scripts

### `scripts/install.sh` (Linux/macOS)
- Auto-discovers Ghidra in common install locations
- Modifies shell rc files (`.bashrc`, `.zshrc`, `.profile`) for PATH
- Creates `.desktop` entry on Linux

### `scripts/install.bat` (Windows)
- Searches common Ghidra install paths
- Detects version string from directory name
- Optionally creates a desktop shortcut

### `scripts/verify.py` (Python 3)
- Verifies Ghidra installation, extension files, and Java version
- Computes SHA-256 checksums
- Outputs a JSON report (`--json` flag)
- Supports `--verbose` and `--quiet` modes

---

## Extension Metadata

`extension.properties` files define the identity visible inside Ghidra:

```
name=CryptoDetect
description=...
author=...
createdOn=...
version=1.0.0-SNAPSHOT
```

`Module.manifest` lists which Ghidra framework modules the extension requires. Incorrect entries here cause silent load failures inside Ghidra.

---

## Compatibility Matrix

| Extension | Ghidra Version | Java |
|-----------|---------------|------|
| CryptoDetect | 12.0+ (recommended) | 17+ |
| RetSync | 9.1.2 – 10.2+ | 11+ |

For CryptoDetect, building against older Ghidra SDKs may work but is untested.

---

## Development Conventions

### Java Style
- Package root: `cryptodetect`
- Sub-packages: `analyzers`, `services`, `ui`
- Ghidra plugin lifecycle hooks: `init()`, `cleanup()`, `programActivated()`, `programDeactivated()`
- UI components extend Ghidra's `ComponentProvider` / `JPanel`

### Adding a New Crypto Pattern
1. Open `PatternMatchingService.java`
2. Add byte array constant for the new signature
3. Register it in the pattern map within the constructor
4. Add corresponding algorithm name string pattern if applicable
5. Update the `DetectionType` enum if a new category is needed

### Adding a New Analyzer
1. Create a class under `cryptodetect/analyzers/`
2. Implement the analyzer interface (mirror `CryptoRoutineAnalyzer`)
3. Register it in `CryptoDetectPlugin.java`
4. Write unit tests using JUnit 4 + Mockito mocks for the `Program` and `Memory` Ghidra APIs

### UI Changes
- `CryptoDetectProvider` owns the toolbar; add new actions there
- `CryptoResultsPanel` owns the table model; extend column definitions there
- Do not add Ghidra API calls directly inside Swing event handlers — dispatch to the `ExecutorService`

---

## Missing / Incomplete Items

The following are known gaps as of the last commit:

- `CryptoAnalysisService` class is referenced but not implemented
- No test source files exist under `src/test/` yet
- `INSTALL.md` and `CHANGELOG.md` referenced in `build-package.bat` do not exist
- RetSync source rebuild requires the external RetSync GitHub repository (not included here)
- MkDocs `docs/` directory content is not committed (generated during CI)

---

## Git Workflow

- Feature work goes on `claude/...` or `feature/...` branches
- The main branch (`main`) should always build
- Commit messages should be imperative, scoped to one logical change
- Do not commit `.zip` build artifacts or Ghidra SDK jars — `.gitignore` covers these

---

## Quick Reference Commands

```bash
# Build CryptoDetect
cd extensions/crypto_detect/source && gradle clean build

# Run tests
gradle test

# Verify installation
python3 scripts/verify.py --verbose

# Install on Linux/macOS
bash scripts/install.sh

# Check Gradle tasks
gradle tasks
```
