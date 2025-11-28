# Check Yo Rep

Know your squad. From City Hall to Capitol Hill.

Enter any US address to find all your elected representatives - local city council, county commissioners, state legislators, and federal Congress members.

## Live Demo

Deployed on Vercel (URL TBD)

## Features

- **Address autocomplete** - Google Places API for easy address entry
- **All levels of government** - Local, County, State, and Federal officials
- **Contact info** - Phone, email, website, and social media links
- **Party affiliation** - Color-coded by political party
- **Photos** - Official photos when available

## Tech Stack

- **Frontend:** React + Vite
- **Styling:** Custom CSS
- **APIs:**
  - [Cicero API](https://www.cicerodata.com/) - Elected officials data (paid, ~$0.03-0.04/lookup)
  - [Google Places API](https://developers.google.com/maps/documentation/places/web-service) - Address autocomplete
- **Hosting:** Vercel (with serverless function for API proxy)

## Local Development

```bash
# Install dependencies
npm install

# Create .env.local with your API keys
VITE_CICERO_API_KEY=your_cicero_key
VITE_GOOGLE_API_KEY=your_google_key

# Run dev server
npm run dev
```

## Deployment

Deployed to Vercel. The `/api/cicero.js` serverless function proxies requests to avoid exposing API keys.

## Cost

Cicero API charges ~$0.03-0.04 per address lookup. Free trial includes 1,000 credits.

After trial: ~$298/year for 10,000 lookups (nonprofit/edu rate).

## Data Sources

- **Officials & Districts:** [Cicero by Melissa](https://www.cicerodata.com/)
- **Address Geocoding:** Google Places API

## License

MIT

---

*Built by Tisa @ Catalyst Partners*
