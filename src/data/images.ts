// All photography is sourced from Unsplash (free for commercial use under the Unsplash License).
export const IMG = {
  udaipurLake: '1615836245337-f5b9b2303f10',
  amerFort: '1599661046289-e31897846e41',
  amerLake: '1599661046827-dacff0c0f09a',
  hawaMahal: '1603262110263-fb0112e7cc33',
  hawaStreet: '1477587458883-47145ed94245',
  mysorePalace: '1590766940554-634a7ed41450',
  tajArch: '1548013146-72479768bada',
  tajPool: '1564507592333-c60657eea523',
  tajDawn: '1585506942812-e72b29cef752',
  varanasiGhats: '1571536802807-30451e3955d8',
  templeGopuram: '1582510003544-4d00b7f74220',
  keralaHouseboat: '1602216056096-3b40cc0c9944',
  keralaBackwater: '1593693397690-362cb9666fc2',
  keralaBoatman: '1506461883276-594a12b11cf3',
  goaBeach: '1512343879784-a960bf40e7f2',
  goaHuts: '1587922546307-776227941871',
  shimlaTown: '1597074866923-dc0589150358',
  himalayaSnow: '1626621341517-bbf3d9990a23',
  himalayaRange: '1605649487212-47bdab064df7',
  himalayaRiver: '1609920658906-8223bd289001',
  goldenTemple: '1514222134-b57cbb8ce073',
  whiteArches: '1524230572899-a752b3835840',

  roomWarm: '1611892440504-42a792e24d32',
  roomClassic: '1590490360182-c33d57733427',
  roomVilla: '1582719478250-c89cae4dc85b',
  roomSuite: '1578683010236-d716f9a3f461',
  roomDeck: '1596394516093-501ba68a0ba6',
  roomDark: '1566665797739-1674de7a421a',
  roomTufted: '1505693416388-ac5ce068fe85',
  roomGold: '1618773928121-c32242e63f39',
  roomArt: '1540518614846-7eded433c457',
  bath: '1507652313519-d4e9174996dd',

  poolNight: '1571896349842-33c89424de2d',
  poolResort: '1566073771259-6a8506099945',
  poolTropical: '1520250497591-112f2f40a3f4',
  poolDusk: '1542314831-068cd1dbfeeb',
  poolDeck: '1584132967334-10e028bd69f7',
  poolPalms: '1551882547-ff40c63fe5fa',
  loungers: '1445019980597-93fa8acb246c',

  fineDining: '1414235077428-338989a2e8c0',
  halwa: '1517244683847-7456b63c5969',
  curryNaan: '1565557623262-b51c2513a641',
  thali: '1567337710282-00832b415979',
  curries: '1585937421612-70a008356fbe',
  curryPot: '1596797038530-2c107229654b',
  samosa: '1601050690597-df0568f70950',
  restaurant: '1552566626-52f8b828add9',

  spaOil: '1544161515-4ab6ce6db874',
  spaStones: '1600334089648-b0d9d3028eb2',
  spaDrop: '1515377905703-c4788e51af15',
  yogaMeditate: '1506126613408-eca07ce68773',
  yogaSunset: '1544367567-0f2fcb009e0b',
  spaTowel: '1540555700478-4be289fbecef',

  banquet: '1519167758481-83f550bb49b3',
  rings: '1515934751635-c81c6bc9a2d8',
  bouquet: '1519741497674-611481863552',
  celebration: '1583939003579-730e3918a45a',
} as const

export type ImgKey = keyof typeof IMG

export function img(key: ImgKey | string, w = 1600, h?: number) {
  const id = (IMG as Record<string, string>)[key] ?? key
  const size = h ? `&h=${h}&fit=crop` : ''
  return `https://images.unsplash.com/photo-${id}?auto=format&q=75&w=${w}${size}`
}
