// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - no type declarations available for 'openid'
import openidModule from 'openid';

const { RelyingParty } = openidModule as {
  RelyingParty: new (
    returnUrl: string,
    realm: string | null,
    stateless: boolean,
    strict: boolean,
    extensions: unknown[]
  ) => {
    authenticate: (
      identifier: string,
      immediate: boolean,
      callback: (err: Error | null, url?: string | null) => void
    ) => void;
    verifyAssertion: (
      requestOrUrl: string,
      callback: (
        err: Error | null,
        result?: { authenticated: boolean; claimedIdentifier?: string }
      ) => void
    ) => void;
  };
};

const STEAM_OPENID_URL = 'https://steamcommunity.com/openid';

export function createRelyingParty(apiUrl: string) {
  return new RelyingParty(
    `${apiUrl}/auth/steam/callback`,
    null,
    true,
    true,
    []
  );
}

export async function getSteamAuthUrl(relyingParty: ReturnType<typeof createRelyingParty>): Promise<string> {
  return new Promise((resolve, reject) => {
    relyingParty.authenticate(STEAM_OPENID_URL, false, (err, url) => {
      if (err) { reject(err); return; }
      if (!url) { reject(new Error('No auth URL')); return; }
      resolve(url);
    });
  });
}

export async function validateSteamCallback(
  relyingParty: ReturnType<typeof createRelyingParty>,
  requestUrl: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    relyingParty.verifyAssertion(requestUrl, (err, result) => {
      if (err) { reject(err); return; }
      if (!result?.authenticated || !result.claimedIdentifier) {
        reject(new Error('Steam auth failed'));
        return;
      }
      const parts = result.claimedIdentifier.split('/');
      const steamId = parts[parts.length - 1];
      if (!steamId) { reject(new Error('Could not extract steamId')); return; }
      resolve(steamId);
    });
  });
}

export async function fetchSteamProfile(steamId: string, apiKey: string) {
  const url = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${apiKey}&steamids=${steamId}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Steam API error: ${res.status}`);
  const data = await res.json() as {
    response: {
      players: Array<{
        steamid: string;
        personaname: string;
        avatarfull: string;
        profileurl: string;
      }>;
    };
  };
  const player = data.response.players[0];
  if (!player) throw new Error('Steam player not found');
  return {
    steamId: player.steamid,
    username: player.personaname,
    avatar: player.avatarfull,
    profileUrl: player.profileurl,
  };
}
