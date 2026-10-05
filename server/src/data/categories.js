// Every category a grid row/column can use.
// type: "club" | "nation" | "award"

export const clubs = [
  { id: 'real_madrid', name: 'Real Madrid', short: 'RMA', country: 'Spain', colors: ['#FFFFFF', '#FEBE10'] },
  { id: 'barcelona', name: 'Barcelona', short: 'BAR', country: 'Spain', colors: ['#A50044', '#004D98'] },
  { id: 'atletico', name: 'Atlético Madrid', short: 'ATM', country: 'Spain', colors: ['#CB3524', '#262F61'] },
  { id: 'sevilla', name: 'Sevilla', short: 'SEV', country: 'Spain', colors: ['#FFFFFF', '#D4021D'] },
  { id: 'valencia', name: 'Valencia', short: 'VAL', country: 'Spain', colors: ['#FFFFFF', '#EE3524'] },
  { id: 'man_utd', name: 'Manchester United', short: 'MUN', country: 'England', colors: ['#DA291C', '#FBE122'] },
  { id: 'man_city', name: 'Manchester City', short: 'MCI', country: 'England', colors: ['#6CABDD', '#1C2C5B'] },
  { id: 'liverpool', name: 'Liverpool', short: 'LIV', country: 'England', colors: ['#C8102E', '#00B2A9'] },
  { id: 'chelsea', name: 'Chelsea', short: 'CHE', country: 'England', colors: ['#034694', '#DBA111'] },
  { id: 'arsenal', name: 'Arsenal', short: 'ARS', country: 'England', colors: ['#EF0107', '#FFFFFF'] },
  { id: 'tottenham', name: 'Tottenham', short: 'TOT', country: 'England', colors: ['#FFFFFF', '#132257'] },
  { id: 'everton', name: 'Everton', short: 'EVE', country: 'England', colors: ['#003399', '#FFFFFF'] },
  { id: 'west_ham', name: 'West Ham', short: 'WHU', country: 'England', colors: ['#7A263A', '#1BB1E7'] },
  { id: 'juventus', name: 'Juventus', short: 'JUV', country: 'Italy', colors: ['#FFFFFF', '#000000'] },
  { id: 'ac_milan', name: 'AC Milan', short: 'MIL', country: 'Italy', colors: ['#FB090B', '#000000'] },
  { id: 'inter', name: 'Inter', short: 'INT', country: 'Italy', colors: ['#0068A8', '#000000'] },
  { id: 'roma', name: 'Roma', short: 'ROM', country: 'Italy', colors: ['#8E1F2F', '#F0BC42'] },
  { id: 'napoli', name: 'Napoli', short: 'NAP', country: 'Italy', colors: ['#12A0D7', '#FFFFFF'] },
  { id: 'lazio', name: 'Lazio', short: 'LAZ', country: 'Italy', colors: ['#87D8F7', '#FFFFFF'] },
  { id: 'bayern', name: 'Bayern Munich', short: 'FCB', country: 'Germany', colors: ['#DC052D', '#0066B2'] },
  { id: 'dortmund', name: 'Borussia Dortmund', short: 'BVB', country: 'Germany', colors: ['#FDE100', '#000000'] },
  { id: 'leverkusen', name: 'Bayer Leverkusen', short: 'B04', country: 'Germany', colors: ['#E32221', '#000000'] },
  { id: 'schalke', name: 'Schalke 04', short: 'S04', country: 'Germany', colors: ['#004D9D', '#FFFFFF'] },
  { id: 'psg', name: 'Paris Saint-Germain', short: 'PSG', country: 'France', colors: ['#004170', '#DA291C'] },
  { id: 'monaco', name: 'Monaco', short: 'ASM', country: 'France', colors: ['#E51B22', '#FFFFFF'] },
  { id: 'lyon', name: 'Lyon', short: 'OL', country: 'France', colors: ['#FFFFFF', '#1A3C8F'] },
  { id: 'marseille', name: 'Marseille', short: 'OM', country: 'France', colors: ['#2FAEE0', '#FFFFFF'] },
  { id: 'ajax', name: 'Ajax', short: 'AJA', country: 'Netherlands', colors: ['#D2122E', '#FFFFFF'] },
  { id: 'psv', name: 'PSV Eindhoven', short: 'PSV', country: 'Netherlands', colors: ['#ED1C24', '#FFFFFF'] },
  { id: 'benfica', name: 'Benfica', short: 'SLB', country: 'Portugal', colors: ['#E83030', '#FFFFFF'] },
  { id: 'porto', name: 'Porto', short: 'FCP', country: 'Portugal', colors: ['#003893', '#FFFFFF'] },
  { id: 'sporting', name: 'Sporting CP', short: 'SCP', country: 'Portugal', colors: ['#008057', '#FFFFFF'] },
  { id: 'galatasaray', name: 'Galatasaray', short: 'GAL', country: 'Turkey', colors: ['#A90432', '#FDB912'] },
  { id: 'fenerbahce', name: 'Fenerbahçe', short: 'FEN', country: 'Turkey', colors: ['#FFED00', '#163962'] },
  { id: 'inter_miami', name: 'Inter Miami', short: 'MIA', country: 'USA', colors: ['#F7B5CD', '#231F20'] },
  { id: 'la_galaxy', name: 'LA Galaxy', short: 'LAG', country: 'USA', colors: ['#00245D', '#FFD200'] },
]

// flag = ISO code understood by flagcdn.com
export const nations = [
  { id: 'nat_france', name: 'France', flag: 'fr' },
  { id: 'nat_brazil', name: 'Brazil', flag: 'br' },
  { id: 'nat_argentina', name: 'Argentina', flag: 'ar' },
  { id: 'nat_spain', name: 'Spain', flag: 'es' },
  { id: 'nat_england', name: 'England', flag: 'gb-eng' },
  { id: 'nat_germany', name: 'Germany', flag: 'de' },
  { id: 'nat_portugal', name: 'Portugal', flag: 'pt' },
  { id: 'nat_netherlands', name: 'Netherlands', flag: 'nl' },
  { id: 'nat_italy', name: 'Italy', flag: 'it' },
  { id: 'nat_belgium', name: 'Belgium', flag: 'be' },
  { id: 'nat_croatia', name: 'Croatia', flag: 'hr' },
  { id: 'nat_uruguay', name: 'Uruguay', flag: 'uy' },
  { id: 'nat_algeria', name: 'Algeria', flag: 'dz' },
  { id: 'nat_colombia', name: 'Colombia', flag: 'co' },
]

export const awards = [
  { id: 'award_ballon_dor', name: "Ballon d'Or", icon: 'ballon', description: "Won the Ballon d'Or" },
  { id: 'award_world_cup', name: 'World Cup', icon: 'trophy', description: 'Won the FIFA World Cup' },
  { id: 'award_ucl', name: 'Champions League', icon: 'star', description: 'Won the UEFA Champions League' },
]

export const allCategories = [
  ...clubs.map((c) => ({ ...c, type: 'club' })),
  ...nations.map((n) => ({ ...n, type: 'nation' })),
  ...awards.map((a) => ({ ...a, type: 'award' })),
]

export const categoryById = new Map(allCategories.map((c) => [c.id, c]))

// Maps a nationality string used in players.js to its nation category id
export const nationIdByName = new Map(nations.map((n) => [n.name, n.id]))
