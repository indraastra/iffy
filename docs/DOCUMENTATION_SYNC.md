# Documentation Synchronization Strategy

This document outlines how to keep documentation synchronized with implementation in the Iffy codebase.

## Core Principle

Documentation lives as close to the code as possible, with clear cross-references between implementation and documentation files.

## Sync Points

### 1. Code-to-Documentation Mapping

Each major component has corresponding documentation:

| Component | Implementation | Documentation |
|-----------|---------------|---------------|
| Prompts | `src/engine/langChainPrompts.ts` | `docs/PROMPTS.md` |
| Schemas | `src/schemas/directorSchemas.ts` | `docs/PROMPTS.md` (Schema section) |
| Flags | `src/engine/FlagManager.ts` | `docs/STORY_FORMAT.md` (Flags section) |
| Architecture | `src/engine/*.ts` | `docs/ARCHITECTURE.md` |
| Story Format | `src/types/impressionistStory.ts` | `docs/STORY_FORMAT.md` |
| Tests | `src/tests/*.test.ts` | `docs/DEVELOPMENT.md` |

### 2. Synchronization Comments

All key implementation files now include `DOCUMENTATION SYNC` comments at the top:

```typescript
/**
 * DOCUMENTATION SYNC: When modifying [component], update:
 * - docs/[relevant].md [specific section]
 * - Test files in src/tests/[relevant].test.ts
 * - [Other related files]
 */
```

### 3. Change Checklist

When modifying code, follow this checklist:

#### Prompt Changes
- [ ] Update prompt method in `langChainPrompts.ts`
- [ ] Update corresponding section in `docs/PROMPTS.md`
- [ ] Update tests in `langChainDirector.test.ts`
- [ ] Update CHANGELOG.md if significant

#### Schema Changes
- [ ] Update schema in `directorSchemas.ts`
- [ ] Update Schema Enforcement in `docs/PROMPTS.md`
- [ ] Update repair prompt in `langChainDirector.ts`
- [ ] Update test expectations
- [ ] Update CHANGELOG.md

#### Flag System Changes
- [ ] Update `FlagManager.ts`
- [ ] Update `docs/STORY_FORMAT.md` Flags section
- [ ] Update `docs/ARCHITECTURE.md` Flag System section
- [ ] Update `docs/PROMPTS.md` Flag Management section
- [ ] Update flag tests
- [ ] Update CHANGELOG.md

#### Story Format Changes
- [ ] Update `impressionistStory.ts` types
- [ ] Update `docs/STORY_FORMAT.md`
- [ ] Update parser in `impressionistParser.ts`
- [ ] Update validation tests
- [ ] Update example stories if needed

## Automated Sync Helpers

### 1. Pre-commit Hook (Recommended)

Add to `.git/hooks/pre-commit`:

```bash
#!/bin/bash
# Check for DOCUMENTATION SYNC comments in changed files
changed_files=$(git diff --cached --name-only | grep -E '\.(ts|js)$')

for file in $changed_files; do
  if grep -q "DOCUMENTATION SYNC" "$file"; then
    echo "⚠️  File $file has documentation sync requirements"
    grep -A 3 "DOCUMENTATION SYNC" "$file"
    echo ""
  fi
done

echo "Please ensure all documentation is updated before committing."
```

### 2. Documentation Tests

Add test to verify documentation exists for key components:

```typescript
// src/tests/documentation.test.ts
describe('Documentation Sync', () => {
  it('should have PROMPTS.md for prompt templates', () => {
    expect(fs.existsSync('docs/PROMPTS.md')).toBe(true);
  });
  
  it('should have sync comments in key files', () => {
    const content = fs.readFileSync('src/engine/langChainPrompts.ts', 'utf8');
    expect(content).toContain('DOCUMENTATION SYNC');
  });
});
```

### 3. JSDoc Integration

Use JSDoc comments for inline documentation that can be extracted:

```typescript
/**
 * Build action instructions with detailed flag management guidance
 * 
 * @see docs/PROMPTS.md#action-processing-prompt
 * @param context - Director context with story state
 * @param flagManager - Flag manager for state tracking
 * @returns Formatted prompt string
 */
static buildActionInstructionsWithFlagGuidance(...) {
```

## Documentation Standards

### 1. Method Documentation

Each public method should have:
- JSDoc comment with description
- `@see` reference to relevant documentation
- Parameter descriptions
- Return type description

### 2. Schema Documentation

Each schema field should have:
- `.describe()` call explaining the field
- Example values in description
- Type constraints documented

### 3. Test Documentation

Each test should:
- Have descriptive test names
- Include comments for complex scenarios
- Reference the feature being tested

## Review Process

### Pull Request Checklist

- [ ] Code changes have corresponding documentation updates
- [ ] DOCUMENTATION SYNC comments are followed
- [ ] New features are documented in appropriate guide
- [ ] CHANGELOG.md updated for significant changes
- [ ] Tests updated to match implementation
- [ ] Examples updated if story format changed

### Documentation Review

When reviewing PRs:
1. Check for DOCUMENTATION SYNC comments in changed files
2. Verify referenced documentation was updated
3. Ensure examples still work with changes
4. Confirm tests cover documented behavior

## Future Improvements

### Potential Automation

1. **Doc Generation Script**: Extract JSDoc to markdown
2. **Sync Validator**: Script to check sync requirements
3. **Auto-update Tool**: Update simple documentation automatically
4. **CI Check**: GitHub Action to verify documentation sync

### Documentation as Code

Consider moving some documentation into code:
- Type definitions with comprehensive JSDoc
- Schema descriptions as source of truth
- Test files as executable documentation
- Example stories with inline comments

## Quick Reference

### When to Update Documentation

| Change Type | Update Required |
|------------|-----------------|
| New prompt method | PROMPTS.md |
| Schema field change | PROMPTS.md schema section |
| Flag behavior change | STORY_FORMAT.md, ARCHITECTURE.md |
| New story feature | STORY_FORMAT.md |
| Performance optimization | ARCHITECTURE.md |
| Bug fix | CHANGELOG.md |
| New test | DEVELOPMENT.md |
| API change | README.md, relevant guide |

### Documentation Files

- `README.md` - User-facing overview
- `CHANGELOG.md` - Version history
- `docs/PROMPTS.md` - Prompt architecture
- `docs/STORY_FORMAT.md` - Story authoring guide
- `docs/ARCHITECTURE.md` - Technical architecture
- `docs/DEVELOPMENT.md` - Developer guide
- `docs/DOCUMENTATION_SYNC.md` - This file

## Maintenance

Review this strategy quarterly and update based on:
- Pain points in keeping docs synced
- New automation opportunities
- Team feedback on documentation gaps
- User confusion areas