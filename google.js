const { google } = require('googleapis');
const { write } = require('./generate-credentials.js');

write();

const KEYFILEPATH = './credentials.json';
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;

const authenticate = async () => {
  const auth = new google.auth.GoogleAuth({
    keyFile: KEYFILEPATH,
    scopes: SCOPES,
  });
  const authClient = await auth.getClient();
  return authClient;
};

const writeToSheet = async (authClient, data) => {
  const sheets = google.sheets({ version: 'v4', auth: authClient });

  const resource = {
    values: [data],
  };

  try {
    const result = await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: '1!A1',
      valueInputOption: 'RAW',
      resource,
    });
    return result;
  } catch (err) {
    throw new Error(err);
  }
};

module.exports = { authenticate, writeToSheet };
