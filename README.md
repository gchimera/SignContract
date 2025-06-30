# Sign PDF API

This is a simple Node.js + Express API that allows uploading a PDF and a customer signature image, fetches a company signature from Firebase Storage, adds both signatures to the bottom right of the last page, and returns the signed PDF.

## How to run locally

1. Install dependencies:

```bash
npm install
```

2. Start the server:

```bash
npm start
```

3. Test the API with curl:

```bash
curl -X POST http://localhost:3000/sign-pdf \
  -F "pdf=@contract.pdf" \
  -F "signature=@customer-signature.png" \
  -F "companySignatureUrl=https://firebasestorage.googleapis.com/your-company-signature.png" \
  --output signed_contract.pdf
```

## Deploy on Render.com

- Push this repository to GitHub.
- Create a new Web Service on Render.com linked to this repo.
- Set Build Command to `npm install`
- Set Start Command to `npm start`

