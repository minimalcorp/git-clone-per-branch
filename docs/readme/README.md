# gcpb Documentation Translations

This directory contains translations of the gcpb README in various languages.

## Available Languages

- **English** - [Main README](../../README.md) (Default)
- **日本語 (Japanese)** - [ja.md](ja.md)

## Contributing Translations

We welcome translations of the gcpb documentation! Here's how to contribute:

### Adding a New Translation

1. **Create a new file** named with the appropriate [ISO 639-1 language code](https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes):
   - `zh.md` for Chinese (中文)
   - `es.md` for Spanish (Español)
   - `fr.md` for French (Français)
   - `de.md` for German (Deutsch)
   - `ko.md` for Korean (한국어)
   - etc.

2. **Translate the content** from the [main English README](../../README.md):
   - Keep code examples and commands in English
   - Translate all descriptive text and explanations
   - Maintain the same structure and formatting
   - Keep external links (GitHub issues, etc.) as-is
   - Preserve markdown formatting and badges

3. **Update this index**:
   - Add your language to the "Available Languages" section above
   - Use the format: `- **Language Name (Native Name)** - [filename.md](filename.md)`

4. **Update the main README**:
   - Add a link to your translation in the "📖 Available in Other Languages" section
   - Use the format: `- [Native Name (English Name)](docs/readme/xx.md)`

5. **Submit a Pull Request**:
   - Make sure your translation is complete and accurate
   - Include a brief description of your translation in the PR

### Translation Guidelines

- **Technical Terms**: Use commonly accepted translations for technical terms in your language
- **Commands**: Keep all bash commands, code snippets, and CLI examples in English
- **Links**: Preserve all external links (GitHub issues, npm packages, etc.)
- **Tone**: Maintain a professional, helpful tone consistent with the original
- **Formatting**: Keep all markdown formatting, badges, and structure identical
- **Accuracy**: Ensure technical accuracy - incorrect translations can mislead users

### Maintaining Translations

When the main English README is updated:
- Translation maintainers will be notified via GitHub issues
- Community members can submit PRs to update translations
- Outdated translations will be marked with a notice until updated

## Language Codes Reference

Common ISO 639-1 language codes:
- `en` - English
- `ja` - Japanese (日本語)
- `zh` - Chinese (中文)
- `es` - Spanish (Español)
- `fr` - French (Français)
- `de` - German (Deutsch)
- `ko` - Korean (한국어)
- `pt` - Portuguese (Português)
- `ru` - Russian (Русский)
- `it` - Italian (Italiano)
- `ar` - Arabic (العربية)
- `hi` - Hindi (हिन्दी)

For regional variants, use the extended format (e.g., `pt-BR` for Brazilian Portuguese, `zh-CN` for Simplified Chinese).

## Questions?

If you have questions about translating the documentation, please:
- Open an issue on GitHub
- Tag it with the `documentation` label
- Mention that it's related to translations

Thank you for helping make gcpb accessible to developers worldwide!
