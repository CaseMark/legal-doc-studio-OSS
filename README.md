# Legal Document Studio

Generate professional legal documents with AI assistance. Built with Next.js and [Case.dev](https://case.dev).

## Features

- **Document Templates**: Employment agreements, NDAs, contractor agreements, consulting agreements, and residential leases
- **AI-Assisted Input**: Describe your needs in plain English and let AI fill in form fields
- **Cloud Storage**: Documents stored securely in your personal Case.dev vault
- **Export Options**: Download as PDF, DOCX, or HTML

## Case.dev Primitives

This application uses the following Case.dev APIs:

| Primitive | Purpose |
|-----------|---------|
| **Vaults** | Secure document storage with metadata |
| **LLM API** | Natural language parsing for form auto-fill |
| **Format API** | PDF and DOCX document conversion |

## Getting Started

### 1. Clone and Install

```bash
git clone https://github.com/CaseMark/legal-doc-studio-OSS.git
cd legal-doc-studio-OSS
bun install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

Add your Case.dev API key to `.env.local`:

```env
CASE_API_KEY=sk_case_your_key_here
```

Get your API key from the [Case.dev Console](https://console.case.dev).

### 3. Run

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000).

On first use, you'll be prompted to enter your Case.dev API key. This key is stored in your browser's localStorage and used for vault operations.

## Project Structure

```
app/
  api/
    vaults/       # Document storage endpoints
    llm/          # AI chat completion
    format/       # PDF/DOCX conversion
  documents/      # Document list and viewer
  generate/       # Document generation wizard
components/
  documents/      # Template selector, document cards
  ui/             # Shadcn UI components
lib/
  vault-client.ts # Case.dev Vault SDK wrapper
  case-api.ts     # LLM and format API integration
  templates.ts    # Document template definitions
```

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Shadcn UI
- **Icons**: Phosphor Icons
- **Runtime**: Bun

## License

[Apache 2.0](LICENSE)
