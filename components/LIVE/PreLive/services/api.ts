
import { ApiResponse } from '../types';

const CORS_PROXY = 'https://corsproxy.io/?';

export async function fetchFixtures(date: string): Promise<ApiResponse> {
  const baseUrl = 'https://webws.365scores.com/web/games/allscores/';
  const params = new URLSearchParams({
    appTypeId: '5',
    langId: '1',
    timezoneName: 'America/Sao_Paulo',
    userCountryId: '21',
    sports: '1',
    startDate: date,
    endDate: date,
    showOdds: 'true',
    onlyMajorGames: 'false',
    withTop: 'true'
  });
  
  const url = `${baseUrl}?${params.toString()}`;
  return fetch(`${CORS_PROXY}${encodeURIComponent(url)}`).then(res => res.json());
}

export async function fetchPreGameStats(gameId: number) {
  const url = `https://webws.365scores.com/web/stats/preGame?appTypeId=5&langId=1&timezoneName=America/Sao_Paulo&userCountryId=21&game=${gameId}&onlyMajor=true&topBookmaker=156`;
  return fetch(`${CORS_PROXY}${encodeURIComponent(url)}`).then(res => res.json());
}

export async function fetchH2H(gameId: number) {
  const url = `https://webws.365scores.com/web/games/h2h/?appTypeId=5&langId=1&timezoneName=America/Sao_Paulo&userCountryId=21&gameId=${gameId}`;
  return fetch(`${CORS_PROXY}${encodeURIComponent(url)}`).then(res => res.json());
}

export function getCompetitorLogo(id: number, version: number = 4) {
  return `https://imagecache.365scores.com/image/upload/f_png,w_64,h_64,c_limit,q_auto:eco,dpr_2/v${version}/Competitors/${id}`;
}

export function getCountryLogo(id: number) {
  return `https://imagecache.365scores.com/image/upload/f_png,w_32,h_32,c_limit,q_auto:eco,dpr_2/Countries/Round/${id}`;
}

export async function fetchBettingLines(gameId: number) {
    const url = `https://webws.365scores.com/web/bets/lines/?appTypeId=5&langId=1&timezoneName=America/Sao_Paulo&userCountryId=21&games=${gameId}`;
    return fetch(`${CORS_PROXY}${encodeURIComponent(url)}`).then(res => res.json());
}
