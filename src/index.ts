const CLIENT_ID = '';
const API_KEY = '';

// Discovery doc URL for APIs used by the quickstart
const DISCOVERY_DOC =
    'https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest';

// Authorization scopes required by the API; multiple scopes can be
// included, separated by spaces.
const SCOPES = 'https://www.googleapis.com/auth/gmail.readonly';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: Unreachable code error
let tokenClient;
let gapiInited = false;
let gisInited = false;

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: Unreachable code error
document.getElementById('authorize_button').style.visibility = 'hidden';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: Unreachable code error
document.getElementById('signout_button').style.visibility = 'hidden';

/**
 * Callback after api.js is loaded.
 */
function gapiLoaded() {
    gapi.load('client', initializeGapiClient);
}

/**
 * Callback after the API client is loaded. Loads the
 * discovery doc to initialize the API.
 */
async function initializeGapiClient() {
    await gapi.client.init({
        apiKey: API_KEY,
        discoveryDocs: [DISCOVERY_DOC],
    });
    gapiInited = true;
    maybeEnableButtons();
}

/**
 * Callback after Google Identity Services are loaded.
 */
function gisLoaded() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore: Unreachable code error
        callback: '', // defined later
    });
    gisInited = true;
    maybeEnableButtons();
}

/**
 * Enables user interaction after all libraries are loaded.
 */
function maybeEnableButtons() {
    if (gapiInited && gisInited) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore: Unreachable code error
        document.getElementById('authorize_button').style.visibility =
            'visible';
    }
}

/**
 *  Sign in the user upon button click.
 */
function handleAuthClick() {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore: Unreachable code error
    tokenClient.callback = async resp => {
        if (resp.error !== undefined) {
            throw resp;
        }
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore: Unreachable code error
        document.getElementById('signout_button').style.visibility = 'visible';
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore: Unreachable code error
        document.getElementById('authorize_button').innerText = 'Refresh';
        await getEmails();
    };

    if (gapi.client.getToken() === null) {
        // Prompt the user to select a Google Account and ask for consent to share their data
        // when establishing a new session.
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore: Unreachable code error
        tokenClient.requestAccessToken({prompt: 'consent'});
    } else {
        // Skip display of account chooser and consent dialog for an existing session.
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore: Unreachable code error
        tokenClient.requestAccessToken({prompt: ''});
    }
}

/**
 *  Sign out the user upon button click.
 */
function handleSignoutClick() {
    const token = gapi.client.getToken();
    if (token !== null) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore: Unreachable code error
        google.accounts.oauth2.revoke(token.access_token);
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore: Unreachable code error
        gapi.client.setToken('');
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore: Unreachable code error
        document.getElementById('content').innerText = '';
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore: Unreachable code error
        document.getElementById('authorize_button').innerText = 'Authorize';
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore: Unreachable code error
        document.getElementById('signout_button').style.visibility = 'hidden';
    }
}

async function getEmails() {
    let emails;
    let rawEmail;
    try {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore: Unreachable code error
        emails = await gapi.client.gmail.users.messages.list({
            userId: 'me',
            q: 'from:notificaciones@popularenlinea.com',
        });

        createTable();
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore: Unreachable code error
        emails.result.messages.slice(0, 10).forEach(async message => {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore: Unreachable code error
            rawEmail = await gapi.client.gmail.users.messages.get({
                userId: 'me',
                id: message.id,
                format: 'full',
            });
            addRowToTable(rawEmail);
        });
    } catch (err) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore: Unreachable code error
        document.getElementById('content').innerText = err.message;
        return;
    }
}

function addRowToTable(rawEmail: Email) {
    const row = parseEmailToTableRow(rawEmail);
    document.getElementById('transactions')?.appendChild(row!);
}

function parseEmailToTableRow(rawEmail: Email) {
    const newDiv = document.createElement('div');
    newDiv.innerHTML = parseResponseToHTML(rawEmail);

    const row = newDiv.querySelector('.myTable2 > tbody > tr:last-child');
    const [, cardName, cardNumber] = getCardInfoFromHTML(newDiv);

    const cardNameCell = document.createElement('td');
    cardNameCell.textContent = cardName;
    const cardNumberCell = document.createElement('td');
    cardNumberCell.textContent = cardNumber;

    row?.append(cardNameCell, cardNumberCell);
    return row;
}

function getCardInfoFromHTML(html: HTMLDivElement) {
    const [, cardInfo] = Array.from(html.getElementsByTagName('p')).map(
        element => element.innerText
    );
    return [
        ...cardInfo.matchAll(
            /Gracias por utilizar su (.*), terminada en {2}(.*)\./g
        ),
    ][0];
}

type Email = {
    result: {
        payload: {parts: {body: {data: any}}[]};
    };
};

function parseResponseToHTML(email: Email) {
    const data = email.result.payload.parts[1].body.data;
    const decodedEmail = atob(
        data.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/')
    );
    return decodedEmail;
}

function createTable() {
    const headerRow = document.createElement('tr');
    const headerTitles = [
        'Monto',
        'Moneda',
        'Fecha',
        'Comercio',
        'Estatus',
        'Tarjeta',
        'Terminal',
    ];

    headerTitles.forEach(title => {
        const header = document.createElement('th');
        header.innerText = title;
        header.className = 'table-header';
        headerRow.appendChild(header);
    });

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore: Unreachable code error
    document.getElementById('transactions').appendChild(headerRow);
}
