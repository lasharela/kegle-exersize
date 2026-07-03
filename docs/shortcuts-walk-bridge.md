# Apple Health → Daily Fitness: walk bridge (iOS Shortcuts)

A PWA cannot read Apple Health. This personal iOS Shortcut reads your daily steps
and posts them to Appwrite, where the dashboard's Walk card picks them up.
One-time setup, ~10 minutes, no Apple developer account.

## Values you'll paste

| Field | Value |
|---|---|
| Endpoint | `https://appwrite.lasharela.com/v1/databases/kegel/collections/activityLogs/documents` |
| Project ID | `699bc6f70004116e14ec` |
| Account ID (userId) | `699be507003e239a8eda` (also shown in the app: Settings → Account) |
| API key | in `.shortcuts-bridge-key` at the repo root on your Mac (gitignored — never commit it). Scoped to documents read/write only. |

## Build the Shortcut

Open **Shortcuts** on iPhone → **+** new shortcut, name it `Log walk`:

1. **Find Health Samples** (action: "Find All Health Samples where")
   - Sample Type: **Steps**
   - Add filter: **Start Date** `is today`
   - Sort by: None · Group samples: **Total** (this sums the day)
2. **Current Date** → add action **Format Date**, Format: **Custom**, string `yyyy-MM-dd`.
3. **Text** action containing (replace the two `Magic Variable` markers with the
   variables from steps 1–2, and `KEY_DATE` twice):

   ```
   {"documentId":"walk-[Formatted Date]","data":{"userId":"699be507003e239a8eda","date":"[Formatted Date]","type":"walk","completed":true,"durationSec":0,"payload":"{\"steps\":[Health Samples]}"},"permissions":["read(\"user:699be507003e239a8eda\")","update(\"user:699be507003e239a8eda\")"]}
   ```

   (Insert **Formatted Date** and the **Health Samples** total via the variable
   picker — don't type the brackets literally.)
4. **Get Contents of URL**
   - URL: the endpoint from the table above
   - Method: **POST**
   - Headers:
     - `X-Appwrite-Project`: `699bc6f70004116e14ec`
     - `X-Appwrite-Key`: *(the API key)*
     - `Content-Type`: `application/json`
   - Request Body: **File** → the **Text** from step 3

Run it once manually and grant Health access when asked. A `409 already exists`
response on a rerun is fine — the document id `walk-<date>` makes it idempotent
(one entry per day; the first run of the evening wins).

## Automate it

Shortcuts → **Automation** tab → **+** → **Time of Day** → 23:30, Daily →
**Run Immediately** (no confirmation) → action: **Run Shortcut** → `Log walk`.

## Notes

- The Walk card is informational — walks don't affect the streak or points.
- The same pattern can later push Health weight entries into `weightLogs` if you
  start logging weight in Apple Health.
- If the key ever leaks, delete the `shortcuts-bridge` key row in the Appwrite
  console (or ask Claude to rotate it) — it can only read/write documents.
