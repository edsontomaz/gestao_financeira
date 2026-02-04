// OneDrive integration via Replit connector
import { Client } from '@microsoft/microsoft-graph-client';
import type { Profile } from '@shared/schema';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings?.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=onedrive',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings?.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('OneDrive not connected');
  }
  return accessToken;
}

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
export async function getOneDriveClient() {
  const accessToken = await getAccessToken();

  return Client.initWithMiddleware({
    authProvider: {
      getAccessToken: async () => accessToken
    }
  });
}

const FINANCE_APP_FOLDER = 'FinanceApp';
const TRANSACTIONS_FILE = 'transactions.json';

function getProfileFolderName(profile: Profile): string {
  return profile === 'edson' ? 'Edson' : 'Tais';
}

export async function ensureFinanceAppFolder(): Promise<string> {
  const client = await getOneDriveClient();
  
  try {
    const folder = await client.api('/me/drive/root/children')
      .filter(`name eq '${FINANCE_APP_FOLDER}'`)
      .get();
    
    if (folder.value && folder.value.length > 0) {
      return folder.value[0].id;
    }
  } catch (error) {
    // Folder doesn't exist, create it
  }
  
  const newFolder = await client.api('/me/drive/root/children')
    .post({
      name: FINANCE_APP_FOLDER,
      folder: {},
      '@microsoft.graph.conflictBehavior': 'rename'
    });
  
  return newFolder.id;
}

export async function ensureProfileFolder(profile: Profile): Promise<string> {
  const client = await getOneDriveClient();
  await ensureFinanceAppFolder();
  
  const profileFolderName = getProfileFolderName(profile);
  const profilePath = `${FINANCE_APP_FOLDER}/${profileFolderName}`;
  
  try {
    const folder = await client.api(`/me/drive/root:/${profilePath}`)
      .get();
    return folder.id;
  } catch (error: any) {
    if (error.statusCode === 404) {
      const newFolder = await client.api(`/me/drive/root:/${FINANCE_APP_FOLDER}:/children`)
        .post({
          name: profileFolderName,
          folder: {},
          '@microsoft.graph.conflictBehavior': 'rename'
        });
      return newFolder.id;
    }
    throw error;
  }
}

export async function saveTransactionsToOneDrive(transactions: any[], profile: Profile): Promise<void> {
  const client = await getOneDriveClient();
  await ensureProfileFolder(profile);
  
  const profileFolderName = getProfileFolderName(profile);
  const content = JSON.stringify(transactions, null, 2);
  
  await client.api(`/me/drive/root:/${FINANCE_APP_FOLDER}/${profileFolderName}/${TRANSACTIONS_FILE}:/content`)
    .put(content);
}

export async function loadTransactionsFromOneDrive(profile: Profile): Promise<any[] | null> {
  const client = await getOneDriveClient();
  const profileFolderName = getProfileFolderName(profile);
  
  try {
    const response = await client.api(`/me/drive/root:/${FINANCE_APP_FOLDER}/${profileFolderName}/${TRANSACTIONS_FILE}:/content`)
      .get();
    
    if (typeof response === 'string') {
      return JSON.parse(response);
    }
    
    // If response is a ReadableStream or ArrayBuffer, convert to text
    if (response instanceof ArrayBuffer) {
      const text = new TextDecoder().decode(response);
      return JSON.parse(text);
    }
    
    return response;
  } catch (error: any) {
    if (error.statusCode === 404) {
      return null;
    }
    throw error;
  }
}

export async function getOneDriveUserInfo(): Promise<{ name: string; email: string } | null> {
  try {
    const client = await getOneDriveClient();
    const user = await client.api('/me').get();
    return {
      name: user.displayName || user.givenName || 'User',
      email: user.mail || user.userPrincipalName || ''
    };
  } catch (error) {
    return null;
  }
}
