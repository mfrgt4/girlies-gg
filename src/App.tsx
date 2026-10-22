import { useEffect, useMemo, useState } from 'react'
import {
  Activity, Bell, ChevronDown, CircleHelp, Compass, Gamepad2, Heart,
  Home, LogIn, LogOut, Menu, MessageCircle, Plus, Search, Settings,
  ShieldCheck, SlidersHorizontal, Sparkles, UserRound, Users, X, Check,
} from 'lucide-react'
import { supabase, isSupabaseConfigured } from './lib/supabase'
import { demoCards, demoGames } from './data/demo'
import type { Game, PlayerCard, Profile } from './types'

type Page = 'home' | 'games' | 'community' | 'friends' | 'messages' | 'profile' | 'settings'
const navItems: { id: Page; label: string; icon: typeof Home }[] = [
  { id: 'home', label: 'Accueil', icon: Home },
  { id: 'games', label: 'Explorer les jeux', icon: Gamepad2 },
  { id: 'community', label: 'Communauté', icon: Compass },
  { id: 'messages', label: 'Messages', icon: MessageCircle },
  { id: 'friends', label: 'Amies', icon: Users },
]

function initials(value?: string | null) {
  return (value || '?').slice(0, 2).toUpperCase()
}

export default function App() {
  const [page, setPage] = useState<Page>('home')
  const [games, setGames] = useState<Game[]>(demoGames)
  const [cards, setCards] = useState<PlayerCard[]>(demoCards)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<any>(null)
  const [search, setSearch] = useState('')
  const [selectedGame, setSelectedGame] = useState('all')
  const [role, setRole] = useState('')
  const [rank, setRank] = useState('')
  const [main, setMain] = useState('')
  const [modal, setModal] = useState<'auth' | 'card' | null>(null)
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup')
  const [mobileNav, setMobileNav] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authUsername, setAuthUsername] = useState('')
  const [cardForm, setCardForm] = useState({ game_id: 'val', nickname: '', main_character: '', game_role: '', game_rank: '', play_style: 'Chill', availability: 'Soirées', seeking: 'Duo', bio: '', tags: 'Chill, Vocal ok', theme: 'rose' })

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession))
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    async function load() {
      if (!supabase) return
      const [{ data: gameRows }, { data: cardRows }] = await Promise.all([
        supabase.from('games').select('*').order('name'),
        supabase.from('player_cards').select('*, profiles(username, avatar_url)').eq('is_published', true).order('created_at', { ascending: false }),
      ])
      if (gameRows?.length) setGames(gameRows as Game[])
      if (cardRows) setCards(cardRows as PlayerCard[])
      if (session?.user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle()
        if (data) setProfile(data as Profile)
      } else setProfile(null)
    }
    void load()
  }, [session])

  useEffect(() => {
    if (notice) {
      const timer = window.setTimeout(() => setNotice(''), 3500)
      return () => window.clearTimeout(timer)
    }
  }, [notice])

  const activeGame = games.find(g => g.id === selectedGame)
  const visibleCards = useMemo(() => cards.filter(card => {
    const matchesGame = selectedGame === 'all' || card.game_id === selectedGame
    const matchesSearch = `${card.nickname} ${card.profiles?.username || ''} ${card.main_character || ''}`.toLowerCase().includes(search.toLowerCase())
    return matchesGame && matchesSearch && (!role || card.game_role === role) && (!rank || card.game_rank === rank) && (!main || card.main_character === main)
  }), [cards, selectedGame, search, role, rank, main])

  async function submitAuth(e: React.FormEvent) {
    e.preventDefault()
    if (!supabase) { setNotice('Ajoute les variables Supabase dans .env.local pour activer les comptes.'); return }
    setBusy(true)
    try {
      if (authMode === 'signup') {
        const { error } = await supabase.auth.signUp({ email: authEmail, password: authPassword, options: { data: { username: authUsername } } })
        if (error) throw error
        setNotice('Compte créé ! Vérifie tes e-mails si la confirmation est activée.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword })
        if (error) throw error
        setNotice('Connexion réussie.')
        setModal(null)
      }
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Une erreur est survenue.') }
    finally { setBusy(false) }
  }

  async function signOut() {
    if (supabase) await supabase.auth.signOut()
    setNotice('Tu es déconnectée.')
    setPage('home')
  }

  async function saveCard(e: React.FormEvent) {
    e.preventDefault()
    if (!session?.user || !supabase) { setNotice('Connecte-toi pour créer une carte.'); setModal('auth'); return }
    setBusy(true)
    try {
      const payload = {
        user_id: session.user.id, game_id: cardForm.game_id, nickname: cardForm.nickname.trim(),
        main_character: cardForm.main_character || null, game_role: cardForm.game_role || null,
        game_rank: cardForm.game_rank || null, play_style: cardForm.play_style || null,
        availability: cardForm.availability || null, seeking: cardForm.seeking || null,
        bio: cardForm.bio, tags: cardForm.tags.split(',').map(s => s.trim()).filter(Boolean).slice(0, 4),
        theme: cardForm.theme, is_published: false,
      }
      const { data, error } = await supabase.from('player_cards').insert(payload).select('*, profiles(username, avatar_url)').single()
      if (error) throw error
      setCards(prev => [data as PlayerCard, ...prev])
      setModal(null)
      setNotice('Carte enregistrée en brouillon. Tu peux la publier depuis ton profil.')
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Impossible d’enregistrer la carte.') }
    finally { setBusy(false) }
  }

  async function publishCard(card: PlayerCard) {
    if (!supabase) return
    const { error } = await supabase.rpc('publish_card', { card: card.id })
    if (error) { setNotice(error.message); return }
    setCards(prev => prev.map(c => c.user_id === card.user_id && c.game_id === card.game_id ? { ...c, is_published: c.id === card.id } : c))
    setNotice('Carte publiée.')
  }

  async function deleteCard(card: PlayerCard) {
    if (!supabase || !session?.user || !window.confirm('Supprimer cette carte ? Cette action est irréversible.')) return
    const { error } = await supabase.from('player_cards').delete().eq('id', card.id).eq('user_id', session.user.id)
    if (error) { setNotice(error.message); return }
    setCards(prev => prev.filter(c => c.id !== card.id))
    setNotice('Carte supprimée.')
  }

  const myCards = cards.filter(c => session?.user && c.user_id === session.user.id)
  const isDemo = !isSupabaseConfigured

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
        <button className="brand" onClick={() => { setPage('home'); setMobileNav(false) }} aria-label="Girlies.gg, accueil">
          <span className="brand-mark">g<span>.</span></span><span className="brand-name">girlies<span>.gg</span><small>YOUR GIRLS, YOUR GAMES.</small></span>
        </button>
        <div className="side-label">MENU</div>
        <nav className="side-nav">
          {navItems.map(item => {
            const Icon = item.icon
            return <button key={item.id} className={`nav-item ${page === item.id ? 'active' : ''}`} onClick={() => { setPage(item.id); setMobileNav(false) }}><Icon size={18} strokeWidth={1.8}/><span>{item.label}</span>{item.id === 'messages' && <span className="nav-dot" />}</button>
          })}
        </nav>
        <div className="side-label games-label">TES JEUX</div>
        <div className="side-games">
          {games.map(game => <button key={game.id} className={`side-game ${selectedGame === game.id ? 'selected' : ''}`} onClick={() => { setSelectedGame(game.id); setPage('community'); setMobileNav(false) }}><span className={`game-symbol ${game.id}`}>{game.id === 'lol' ? 'L' : game.id === 'val' ? 'V' : game.id === 'apex' ? 'A' : 'F'}</span>{game.name}</button>)}
        </div>
        <div className="sidebar-bottom">
          <div className="community-note"><span className="note-icon"><Sparkles size={16}/></span><strong>La communauté avant tout.</strong><p>Trouve tes prochaines partenaires de jeu.</p></div>
          <button className="nav-item" onClick={() => setPage('settings')}><Settings size={18}/><span>Paramètres</span></button>
          {session ? <button className="nav-item" onClick={signOut}><LogOut size={18}/><span>Déconnexion</span></button> : <button className="nav-item" onClick={() => setModal('auth')}><LogIn size={18}/><span>Se connecter</span></button>}
          <div className="sidebar-user"><div className="avatar avatar-small">{initials(profile?.username || session?.user?.email)}</div><div className="user-meta"><strong>{profile?.username || (session ? 'Mon compte' : 'Invitée')}</strong><span>{session ? 'Membre Girlies' : 'Mode découverte'}</span></div><button className="icon-button tiny" onClick={() => setPage('profile')} aria-label="Mon profil"><ChevronDown size={16}/></button></div>
        </div>
      </aside>
      {mobileNav && <button className="scrim" aria-label="Fermer le menu" onClick={() => setMobileNav(false)} />}
      <main className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setMobileNav(true)} aria-label="Ouvrir le menu"><Menu size={20}/></button>
          <div className="breadcrumb"><span>Girlies.gg</span><span className="crumb-slash">/</span><strong>{page === 'home' ? 'Accueil' : page === 'games' ? 'Explorer les jeux' : page === 'community' ? (activeGame?.name || 'Communauté') : page === 'friends' ? 'Amies' : page === 'messages' ? 'Messages' : page === 'profile' ? 'Mon profil' : 'Paramètres'}</strong></div>
          <div className="top-actions"><label className="global-search"><Search size={16}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher une joueuse..." /><kbd>⌘ K</kbd></label><button className="icon-button" aria-label="Notifications" onClick={() => setNotice('Tu es à jour !')}><Bell size={18}/></button><button className="top-avatar" onClick={() => setPage('profile')}>{initials(profile?.username || session?.user?.email)}</button></div>
        </header>

        <div className="content">
          {isDemo && <div className="demo-banner"><span className="demo-pulse"/><span><strong>Aperçu de démonstration</strong> · Les profils affichés sont des exemples. Configure Supabase pour activer les comptes et les données réelles.</span><button onClick={() => setNotice('Copie .env.example en .env.local et ajoute les clés de ton projet Supabase.')}>Configurer <ChevronDown size={14}/></button></div>}

          {page === 'home' && <HomePage games={games} cards={cards} onGame={id => { setSelectedGame(id); setPage('community') }} onCommunity={() => setPage('community')} onCreate={() => setModal('card')} />}
          {page === 'games' && <GamesPage games={games} cards={cards} onGame={id => { setSelectedGame(id); setPage('community') }} />}
          {page === 'community' && <CommunityPage games={games} cards={visibleCards} selectedGame={selectedGame} setSelectedGame={id => { setSelectedGame(id); setRole(''); setRank(''); setMain('') }} search={search} setSearch={setSearch} role={role} setRole={setRole} rank={rank} setRank={setRank} main={main} setMain={setMain} onCreate={() => setModal('card')} />}
          {page === 'profile' && <ProfilePage profile={profile} session={session} cards={myCards} onCreate={() => setModal('card')} onPublish={publishCard} onDelete={deleteCard} onAuth={() => setModal('auth')} />}
          {page === 'friends' && <EmptyFeature icon={<Users size={22}/>} title="Tes amies, au même endroit" text="Les demandes et ta liste d’amies apparaîtront ici une fois connectée. Cette section sera reliée à la table friendships." action="Se connecter" onAction={() => setModal('auth')} />}
          {page === 'messages' && <EmptyFeature icon={<MessageCircle size={22}/>} title="Les conversations commencent ici" text="Tes messages privés et les chats de chaque jeu seront réunis dans cet espace." action="Explorer la communauté" onAction={() => setPage('community')} />}
          {page === 'settings' && <SettingsPage session={session} profile={profile} onNotice={setNotice} onSignOut={signOut} />}
        </div>
        <footer className="footer"><span>girlies.gg <span className="footer-dot">•</span> Your girls, your games.</span><span>Une communauté qui joue ensemble.</span></footer>
      </main>

      {modal === 'auth' && <Modal title={authMode === 'signup' ? 'Rejoins Girlies.gg' : 'Ravie de te revoir'} subtitle={authMode === 'signup' ? 'Crée ton espace et trouve tes prochaines partenaires.' : 'Connecte-toi pour retrouver ta communauté.'} onClose={() => setModal(null)}><form className="form-stack" onSubmit={submitAuth}>{authMode === 'signup' && <label>Pseudo<input required minLength={3} maxLength={20} value={authUsername} onChange={e => setAuthUsername(e.target.value)} placeholder="tonpseudo" /></label>}<label>E-mail<input required type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder="toi@exemple.fr" /></label><label>Mot de passe<input required minLength={6} type="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} placeholder="6 caractères minimum" /></label><button className="primary-button full" disabled={busy}>{busy ? 'Chargement…' : authMode === 'signup' ? 'Créer mon compte' : 'Me connecter'}</button><p className="form-switch">{authMode === 'signup' ? 'Déjà membre ?' : 'Pas encore de compte ?'} <button type="button" onClick={() => setAuthMode(authMode === 'signup' ? 'login' : 'signup')}>{authMode === 'signup' ? 'Se connecter' : 'Créer un compte'}</button></p></form></Modal>}

      {modal === 'card' && <Modal title="Créer ta carte" subtitle="Présente ton style de jeu à la communauté." onClose={() => setModal(null)}><form className="form-stack" onSubmit={saveCard}><label>Jeu<select value={cardForm.game_id} onChange={e => setCardForm({ ...cardForm, game_id: e.target.value, main_character: '', game_role: '', game_rank: '' })}>{games.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></label><label>Pseudo de jeu<input required maxLength={20} value={cardForm.nickname} onChange={e => setCardForm({ ...cardForm, nickname: e.target.value })} placeholder="tonpseudo" /></label><div className="form-row"><label>Main<select value={cardForm.main_character} onChange={e => setCardForm({ ...cardForm, main_character: e.target.value })}><option value="">À choisir</option>{games.find(g => g.id === cardForm.game_id)?.characters.map(v => <option key={v}>{v}</option>)}</select></label><label>Rôle<select value={cardForm.game_role} onChange={e => setCardForm({ ...cardForm, game_role: e.target.value })}><option value="">À choisir</option>{games.find(g => g.id === cardForm.game_id)?.roles.map(v => <option key={v}>{v}</option>)}</select></label></div><label>Rang<select value={cardForm.game_rank} onChange={e => setCardForm({ ...cardForm, game_rank: e.target.value })}><option value="">À choisir</option>{games.find(g => g.id === cardForm.game_id)?.ranks.map(v => <option key={v}>{v}</option>)}</select></label><div className="form-row"><label>Style de jeu<select value={cardForm.play_style} onChange={e => setCardForm({ ...cardForm, play_style: e.target.value })}>{['Chill','Fun','Ranked','Tryhard','Teamplay','Casual'].map(v => <option key={v}>{v}</option>)}</select></label><label>Disponibilité<select value={cardForm.availability} onChange={e => setCardForm({ ...cardForm, availability: e.target.value })}>{['Soirées','Après-midi','Week-ends','Variable'].map(v => <option key={v}>{v}</option>)}</select></label></div><label>Tu cherches…<input value={cardForm.seeking} onChange={e => setCardForm({ ...cardForm, seeking: e.target.value })} placeholder="Un duo chill, une team ranked…" /></label><label>Petite bio<textarea maxLength={140} value={cardForm.bio} onChange={e => setCardForm({ ...cardForm, bio: e.target.value })} placeholder="Présente-toi en quelques mots…" /></label><label>Tags <span className="field-hint">(4 maximum, séparés par des virgules)</span><input value={cardForm.tags} onChange={e => setCardForm({ ...cardForm, tags: e.target.value })} /></label><button className="primary-button full" disabled={busy}>{busy ? 'Enregistrement…' : 'Enregistrer la carte'}</button><p className="field-hint">La carte est créée en brouillon. Tu pourras ensuite la publier depuis ton profil.</p></form></Modal>}
      {notice && <div className="toast" role="status"><Check size={16}/>{notice}<button onClick={() => setNotice('')} aria-label="Fermer"><X size={15}/></button></div>}
    </div>
  )
}

function HomePage({ games, cards, onGame, onCommunity, onCreate }: { games: Game[]; cards: PlayerCard[]; onGame: (id: string) => void; onCommunity: () => void; onCreate: () => void }) {
  return <><section className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-line"/> L’ESPACE DES GIRLIES</div><h1>Tes jeux. <span>Tes girlies.</span></h1><p className="lead">Trouve tes prochaines partenaires de jeu, à ton rythme.</p></div><button className="primary-button" onClick={onCreate}><Plus size={17}/> Créer ma carte</button></section><section className="hero-panel"><div className="hero-copy"><span className="hero-label"><Sparkles size={14}/> YOUR GIRLS, YOUR GAMES.</span><h2>Le gaming est<br/>encore mieux <em>ensemble.</em></h2><p>Découvre des joueuses qui partagent tes jeux, ton énergie et ta façon de jouer.</p><button className="light-button" onClick={onCommunity}>Explorer la communauté <span>↗</span></button></div><div className="hero-art" aria-hidden="true"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="hero-card hero-card-back"><span>GG</span><small>PLAYER CARD</small></div><div className="hero-card hero-card-front"><div className="hero-avatar">g.</div><span className="hero-card-name">your next duo</span><span className="hero-card-sub">IS CLOSER THAN YOU THINK</span><div className="hero-card-tags"><i>chill</i><i>duo</i><i>ranked</i></div></div><div className="floating-badge badge-one"><Heart size={14} fill="currentColor"/> good vibes</div><div className="floating-badge badge-two"><span className="online-dot"/> girls online</div></div></section><section className="section-block"><div className="section-heading"><div><span className="eyebrow">À TOI DE JOUER</span><h2>Choisis ton univers</h2></div><button className="text-button" onClick={() => onGame(games[0]?.id || 'val')}>Tous les jeux <span>→</span></button></div><div className="game-grid">{games.map((g, i) => <button key={g.id} className={`game-card game-${g.id}`} onClick={() => onGame(g.id)}><div className="game-card-top"><span className={`game-symbol ${g.id}`}>{g.id === 'lol' ? 'L' : g.id === 'val' ? 'V' : g.id === 'apex' ? 'A' : 'F'}</span><span className="game-arrow">↗</span></div><div><span className="game-genre">{g.genre}</span><h3>{g.name}</h3><p>{g.description}</p></div><div className="game-card-bottom"><span>Explorer les joueuses</span><span>→</span></div><span className="game-watermark">{g.id === 'lol' ? 'LoL' : g.id === 'val' ? 'VAL' : g.id === 'apex' ? 'APEX' : 'FN'}</span></button>)}</div></section><section className="section-block"><div className="section-heading"><div><span className="eyebrow">LA COMMUNAUTÉ</span><h2>Des joueuses à découvrir</h2></div><button className="text-button" onClick={onCommunity}>Voir tout <span>→</span></button></div><div className="player-grid">{cards.slice(0, 3).map(card => <PlayerCardView key={card.id} card={card} game={games.find(g => g.id === card.game_id)} />)}</div></section></>
}

function GamesPage({ games, cards, onGame }: { games: Game[]; cards: PlayerCard[]; onGame: (id: string) => void }) {
  return <><PageIntro eyebrow="EXPLORER" title="Trouve ton prochain lobby." text="Choisis un jeu pour découvrir les joueuses qui y jouent."/><div className="game-grid games-page-grid">{games.map(g => <button key={g.id} className={`game-card game-${g.id}`} onClick={() => onGame(g.id)}><div className="game-card-top"><span className={`game-symbol ${g.id}`}>{g.id.toUpperCase().slice(0,1)}</span><span className="game-arrow">↗</span></div><div><span className="game-genre">{g.genre}</span><h3>{g.name}</h3><p>{g.description}</p></div><div className="game-card-bottom"><span>{cards.filter(c => c.game_id === g.id).length} cartes visibles</span><span>→</span></div></button>)}</div></>
}

function CommunityPage(props: { games: Game[]; cards: PlayerCard[]; selectedGame: string; setSelectedGame: (id: string) => void; search: string; setSearch: (s: string) => void; role: string; setRole: (s: string) => void; rank: string; setRank: (s: string) => void; main: string; setMain: (s: string) => void; onCreate: () => void }) {
  const game = props.games.find(g => g.id === props.selectedGame)
  const options = (key: 'roles' | 'ranks' | 'characters') => game?.[key] || []
  return <><PageIntro eyebrow="COMMUNAUTÉ" title={game ? game.name : 'Trouve tes girlies.'} text={game ? game.description || 'Découvre les joueuses de cet univers.' : 'Des joueuses, des univers et peut-être ton prochain duo.'} action={<button className="primary-button" onClick={props.onCreate}><Plus size={17}/> Créer une carte</button>}/><div className="game-tabs"><button className={props.selectedGame === 'all' ? 'tab-active' : ''} onClick={() => props.setSelectedGame('all')}>Tous les jeux</button>{props.games.map(g => <button key={g.id} className={props.selectedGame === g.id ? 'tab-active' : ''} onClick={() => props.setSelectedGame(g.id)}>{g.name}</button>)}</div><div className="filter-bar"><div className="filter-search"><Search size={16}/><input value={props.search} onChange={e => props.setSearch(e.target.value)} placeholder="Pseudo, main…" /></div><span className="filter-divider"/><SlidersHorizontal size={16} className="filter-icon"/><select value={props.role} onChange={e => props.setRole(e.target.value)}><option value="">Tous les rôles</option>{options('roles').map(v => <option key={v}>{v}</option>)}</select><select value={props.main} onChange={e => props.setMain(e.target.value)}><option value="">Tous les mains</option>{options('characters').map(v => <option key={v}>{v}</option>)}</select><select value={props.rank} onChange={e => props.setRank(e.target.value)}><option value="">Tous les rangs</option>{options('ranks').map(v => <option key={v}>{v}</option>)}</select><button className="reset-button" onClick={() => { props.setRole(''); props.setMain(''); props.setRank('') }}>Réinitialiser</button></div><div className="results-line"><span><strong>{props.cards.length}</strong> carte{props.cards.length > 1 ? 's' : ''} à découvrir</span><span className="sort-label">Les plus récentes <ChevronDown size={14}/></span></div>{props.cards.length ? <div className="player-grid">{props.cards.map(card => <PlayerCardView key={card.id} card={card} game={props.games.find(g => g.id === card.game_id)} />)}</div> : <div className="empty-state"><div className="empty-icon"><Search size={22}/></div><h3>Aucune joueuse trouvée</h3><p>Essaie d’autres filtres ou explore un autre jeu.</p><button className="secondary-button" onClick={() => { props.setSelectedGame('all'); props.setRole(''); props.setMain(''); props.setRank(''); props.setSearch('') }}>Effacer les filtres</button></div>}</>
}

function PlayerCardView({ card, game }: { card: PlayerCard; game?: Game }) {
  const theme = ['rose','lilac','blue','neutral'].includes(card.theme) ? card.theme : 'rose'
  return <article className={`player-card theme-${theme}`}><div className="player-card-cover"><span className="player-game-label">{game?.name || 'Jeu'}</span><span className="player-card-mark">gg.</span><div className="player-avatar">{initials(card.profiles?.username || card.nickname)}</div></div><div className="player-card-body"><div className="player-title-row"><div><h3>{card.nickname}</h3><span className="player-handle">@{card.profiles?.username || card.nickname}</span></div><span className="status-pill"><span className="status-dot"/> joue</span></div><p className="player-bio">{card.bio || 'À la recherche de nouvelles partenaires de jeu.'}</p><div className="player-stats"><div><span>MAIN</span><strong>{card.main_character || '—'}</strong></div><div><span>RÔLE</span><strong>{card.game_role || '—'}</strong></div><div><span>RANG</span><strong>{card.game_rank || '—'}</strong></div></div><div className="tag-row">{(card.tags || []).slice(0, 3).map(tag => <span key={tag} className="tag">{tag}</span>)}</div><div className="player-card-footer"><span>{card.seeking || 'Ouverte aux rencontres'}</span><button aria-label={`Voir le profil de ${card.nickname}`} onClick={() => window.alert('Le profil détaillé et les demandes d’amitié seront connectés dans la prochaine étape.')}>Voir le profil <span>↗</span></button></div></div></article>
}

function ProfilePage({ profile, session, cards, onCreate, onPublish, onDelete, onAuth }: { profile: Profile | null; session: any; cards: PlayerCard[]; onCreate: () => void; onPublish: (c: PlayerCard) => void; onDelete: (c: PlayerCard) => void; onAuth: () => void }) {
  if (!session) return <EmptyFeature icon={<UserRound size={22}/>} title="Ton espace personnel" text="Connecte-toi pour gérer ton profil, créer tes cartes et personnaliser ton identité gaming." action="Connexion / inscription" onAction={onAuth}/>
  return <><PageIntro eyebrow="MON ESPACE" title={`Hello, ${profile?.username || 'girlies'} ✦`} text="Gère tes cartes et la façon dont tu te présentes à la communauté." action={<button className="primary-button" onClick={onCreate}><Plus size={17}/> Nouvelle carte</button>}/><div className="profile-summary"><div className="profile-avatar">{initials(profile?.username || session.user?.email)}</div><div><h2>{profile?.username || 'Ton pseudo'}</h2><p>{profile?.bio || 'Ajoute une bio pour que les autres joueuses apprennent à te connaître.'}</p><span className="member-label"><ShieldCheck size={14}/> Membre Girlies.gg</span></div></div><div className="section-heading profile-section-heading"><div><span className="eyebrow">TES CARTES</span><h2>Ton univers gaming</h2></div><span className="count-pill">{cards.length} carte{cards.length > 1 ? 's' : ''}</span></div>{cards.length ? <div className="owned-cards">{cards.map(card => <div className="owned-card" key={card.id}><div className={`owned-symbol ${card.game_id}`}>{card.game_id.toUpperCase()}</div><div className="owned-info"><strong>{card.nickname}</strong><span>{card.game_id.toUpperCase()} · {card.main_character || 'Main non défini'} · {card.game_rank || 'Rang non défini'}</span><span className={`publication-state ${card.is_published ? 'published' : ''}`}>{card.is_published ? 'Publiée' : 'Brouillon'}</span></div><div className="owned-actions">{!card.is_published && <button className="secondary-button compact" onClick={() => onPublish(card)}>Publier</button>}<button className="danger-button" onClick={() => onDelete(card)}>Supprimer</button></div></div>)}</div> : <div className="empty-state"><div className="empty-icon"><Gamepad2 size={22}/></div><h3>Ton aventure commence ici</h3><p>Crée ta première carte pour te présenter aux autres joueuses.</p><button className="primary-button" onClick={onCreate}><Plus size={16}/> Créer ma carte</button></div>}</>
}

function SettingsPage({ session, profile, onNotice, onSignOut }: { session: any; profile: Profile | null; onNotice: (s: string) => void; onSignOut: () => void }) {
  const [visible, setVisible] = useState(true)
  const [online, setOnline] = useState(true)
  const [messages, setMessages] = useState(true)
  const [requests, setRequests] = useState(true)
  useEffect(() => {
    if (!supabase || !session?.user) return
    supabase.from('user_settings').select('*').eq('user_id', session.user.id).maybeSingle().then(({ data }) => {
      if (data) { setVisible(data.profile_visible); setOnline(data.show_online_status); setMessages(data.notify_messages); setRequests(data.notify_friend_requests) }
    })
  }, [session])
  async function save() {
    if (!supabase || !session?.user) { onNotice('Connecte-toi pour enregistrer les paramètres.'); return }
    const { error } = await supabase.from('user_settings').update({ profile_visible: visible, show_online_status: online, notify_messages: messages, notify_friend_requests: requests }).eq('user_id', session.user.id)
    onNotice(error ? error.message : 'Paramètres enregistrés.')
  }
  async function deleteAccount() {
    if (!supabase || !session?.user) return
    if (!window.confirm('Supprimer définitivement ton compte et toutes les données associées ?')) return
    const { error } = await supabase.rpc('delete_my_account')
    if (error) onNotice(error.message)
    else { await supabase.auth.signOut(); onNotice('Compte supprimé.'); }
  }
  return <><PageIntro eyebrow="PRÉFÉRENCES" title="Tes paramètres." text="Garde le contrôle sur ton espace et tes interactions."/><div className="settings-layout"><section className="settings-panel"><div className="settings-panel-head"><div><h3>Confidentialité</h3><p>Choisis ce que les autres joueuses peuvent voir.</p></div><ShieldCheck size={19}/></div><SettingToggle title="Profil visible" desc="Ton profil et tes cartes publiées peuvent être découverts." value={visible} setValue={setVisible}/><SettingToggle title="Afficher mon statut en ligne" desc="Autorise l’affichage de ta présence lorsque disponible." value={online} setValue={setOnline}/><div className="settings-panel-head second-head"><div><h3>Notifications</h3><p>Choisis les alertes que tu souhaites recevoir.</p></div><Bell size={19}/></div><SettingToggle title="Messages privés" desc="Être informée de nouveaux messages." value={messages} setValue={setMessages}/><SettingToggle title="Demandes d’amitié" desc="Être informée des nouvelles demandes." value={requests} setValue={setRequests}/><button className="primary-button" onClick={save}>Enregistrer les préférences</button></section><section className="settings-panel danger-panel"><div><h3>Zone sensible</h3><p>Les actions ci-dessous ont un impact sur ton compte.</p></div><button className="secondary-button" onClick={onSignOut}>Se déconnecter</button><button className="danger-button danger-account" onClick={deleteAccount}>Supprimer mon compte</button><p className="field-hint">La suppression du compte est définitive et supprime les données liées via les relations configurées en base.</p></section></div></>
}

function SettingToggle({ title, desc, value, setValue }: { title: string; desc: string; value: boolean; setValue: (v: boolean) => void }) {
  return <div className="setting-row"><div><strong>{title}</strong><p>{desc}</p></div><button className={`toggle ${value ? 'toggle-on' : ''}`} role="switch" aria-checked={value} onClick={() => setValue(!value)}><span/></button></div>
}

function EmptyFeature({ icon, title, text, action, onAction }: { icon: React.ReactNode; title: string; text: string; action: string; onAction: () => void }) {
  return <div className="feature-empty"><div className="empty-icon">{icon}</div><span className="eyebrow">BIENTÔT DANS TON ESPACE</span><h1>{title}</h1><p>{text}</p><button className="primary-button" onClick={onAction}>{action} <span>→</span></button></div>
}

function PageIntro({ eyebrow, title, text, action }: { eyebrow: string; title: string; text: string; action?: React.ReactNode }) {
  return <section className="page-intro"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{text}</p></div>{action}</section>
}

function Modal({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-head"><div><h2 id="modal-title">{title}</h2><p>{subtitle}</p></div><button className="icon-button" onClick={onClose} aria-label="Fermer"><X size={18}/></button></div>{children}</section></div>
}
