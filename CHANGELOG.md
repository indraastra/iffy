# Changelog

All notable changes to Iffy will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Enhanced flag system supporting non-boolean values (strings, numbers)
- Automatic location tracking through flag system
- Hierarchical flag dependencies with requirement validation
- Real-time flag state display in debug pane
- Comprehensive integration testing framework for narrative styles
- Flag condition evaluation with complex logic (all_of, any_of, none_of)

### Changed
- Refactored flag system from set/clear arrays to flexible values object
- Improved narrative style to use subtle, naturalistic language
- Updated all example stories to demonstrate new flag capabilities
- Enhanced debug pane to display different flag value types
- Modernized test suite to support new flag format

### Fixed
- Debug pane display issues with flag states
- Test failures related to error handling in langChainDirector
- Flag system now properly validates dependencies before setting values

## [0.3.0] - 2024-01-10

### Added
- GitHub Pages deployment with hash router support
- Comprehensive integration testing framework
- Flag-based ending system
- Automatic scene transitions based on flag conditions

### Changed
- Switched from browser router to hash router for GitHub Pages compatibility
- Replaced theatrical metaphors with more subtle narrative approaches
- Improved action classification with stricter prerequisite evaluation

### Fixed
- Transition test files to use flag-based endings
- Debug pane display issues
- Action classifier false positive transitions

## [0.2.0] - 2023-12-15

### Added
- Multi-model AI support (Anthropic Claude, Google Gemini, OpenAI GPT)
- Advanced memory management system
- Character behavior states based on flags
- Scene transition requirements using flag conditions

### Changed
- Improved story parser with better validation
- Enhanced error handling for malformed AI responses
- Optimized bundle size and loading performance

## [0.1.0] - 2023-11-01

### Added
- Initial release of Iffy Interactive Fiction Engine
- Impressionist story format with sketch-based narratives
- Basic flag system for state tracking
- Save/load functionality
- Example stories demonstrating core features
- Vue 3 frontend with TypeScript
- Integration with Anthropic Claude API