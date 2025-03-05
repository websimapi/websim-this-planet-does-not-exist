import { PlanetRenderer, MiniPlanetRenderer } from './3d-renderer.js';
import { generatePlanetDescription, generatePlanetImage, createPlanetRecord } from './planet-generator.js';

const { useState, useEffect, useRef, useMemo } = React;

function LoadingOverlay({ message }) {
  return (
    <div className="loading-overlay">
      <div className="spinner"></div>
      <div className="loading-text">{message}</div>
    </div>
  );
}

function PlanetGenerator() {
  const [seed, setSeed] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' });
  const [generating, setGenerating] = useState(false);
  const [currentPlanet, setCurrentPlanet] = useState(null);
  const planetContainerRef = useRef(null);
  const rendererRef = useRef(null);

  useEffect(() => {
    if (planetContainerRef.current && !rendererRef.current) {
      rendererRef.current = new PlanetRenderer(planetContainerRef.current);
      
      // Initial empty planet
      rendererRef.current.createPlanet();
    }

    return () => {
      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    // Handle resize
    const handleResize = () => {
      if (rendererRef.current && planetContainerRef.current) {
        rendererRef.current.updateSize(
          planetContainerRef.current.clientWidth,
          planetContainerRef.current.clientHeight
        );
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial size

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update planet texture when currentPlanet changes
  useEffect(() => {
    if (currentPlanet && rendererRef.current) {
      rendererRef.current.createPlanet(currentPlanet.imageUrl);
    }
  }, [currentPlanet]);

  const generatePlanet = async () => {
    setGenerating(true);
    setStatus({ type: 'loading', message: 'Discovering new planet...' });
    
    try {
      // Step 1: Generate planet description
      setStatus({ type: 'loading', message: 'Analyzing planetary data...' });
      const planetData = await generatePlanetDescription(seed);
      
      // Step 2: Generate planet image based on description
      setStatus({ type: 'loading', message: `Imaging planet ${planetData.name}...` });
      const imageUrl = await generatePlanetImage(planetData);
      
      // Step 3: Create complete planet object
      const completePlanet = {
        ...planetData,
        imageUrl
      };
      
      // Step 4: Save to database
      setStatus({ type: 'loading', message: 'Recording in galactic database...' });
      const planetRecord = await createPlanetRecord(completePlanet);
      
      // Update state and render planet
      setCurrentPlanet(planetRecord);
      setStatus({ type: 'success', message: `Successfully discovered planet ${planetData.name}!` });
      
      // Reset seed
      setSeed('');
    } catch (error) {
      console.error('Error generating planet:', error);
      setStatus({ type: 'error', message: 'Failed to discover planet. Try again!' });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="planet-generator">
      <h2>Discover a New Planet</h2>
      
      <div className="form-group">
        <label htmlFor="seed">Planet Seed (optional):</label>
        <input
          type="text"
          id="seed"
          value={seed}
          onChange={(e) => setSeed(e.target.value)}
          placeholder="Enter a seed or leave blank for random"
          disabled={generating}
        />
      </div>
      
      <button onClick={generatePlanet} disabled={generating}>
        Generate Planet
      </button>
      
      {status.message && (
        <div className={`status ${status.type}`}>
          {status.message}
        </div>
      )}
      
      <div className="planet-container">
        <div ref={planetContainerRef} className="canvas-container"></div>
      </div>
      
      {currentPlanet && (
        <div className="planet-info">
          <h3>{currentPlanet.name}</h3>
          <p>{currentPlanet.description}</p>
        </div>
      )}
      
      {generating && <LoadingOverlay message={status.message} />}
    </div>
  );
}

function PlanetCard({ planet }) {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  
  useEffect(() => {
    if (containerRef.current && !rendererRef.current) {
      rendererRef.current = new MiniPlanetRenderer(containerRef.current);
      rendererRef.current.createPlanet(planet.imageUrl);
    }
    
    return () => {
      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current = null;
      }
    };
  }, [planet.imageUrl]);
  
  return (
    <div className="planet-card">
      <div className="planet-preview">
        <div ref={containerRef} style={{ width: '100%', height: '100%' }}></div>
      </div>
      <div className="planet-info">
        <h3 className="planet-name">{planet.name}</h3>
        <p className="planet-description">{planet.summary}</p>
        <p className="planet-creator">Discovered by: {planet.username}</p>
      </div>
    </div>
  );
}

function Gallery() {
  const [planets, setPlanets] = useState([]);
  
  // Use React's synced external store for realtime updates
  const latestPlanets = React.useSyncExternalStore(
    room.collection('planet').subscribe,
    room.collection('planet').getList
  );
  
  useEffect(() => {
    if (latestPlanets) {
      // Sort planets by creation date (newest first)
      const sortedPlanets = [...latestPlanets].sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      );
      setPlanets(sortedPlanets);
    }
  }, [latestPlanets]);
  
  return (
    <div className="gallery">
      <div className="gallery-header">
        <h2>Galactic Discoveries</h2>
        <p>{planets.length} planets discovered</p>
      </div>
      
      <div className="planets-grid">
        {planets.map(planet => (
          <PlanetCard key={planet.id} planet={planet} />
        ))}
        
        {planets.length === 0 && (
          <p>No planets discovered yet. Be the first to generate one!</p>
        )}
      </div>
    </div>
  );
}

function App() {
  const [creatorUsername, setCreatorUsername] = useState('');
  
  useEffect(() => {
    const fetchCreator = async () => {
      try {
        const creator = await window.websim.getCreatedBy();
        setCreatorUsername(creator.username);
      } catch (error) {
        console.error('Error fetching creator:', error);
      }
    };
    
    fetchCreator();
  }, []);

  return (
    <div className="app">
      <header className="header">
        <h1>This 3D Planet Does Not Exist</h1>
        {creatorUsername && <p>Created by {creatorUsername}</p>}
      </header>
      
      <main className="content">
        <PlanetGenerator />
        <Gallery />
      </main>
    </div>
  );
}

// Render the React app
const container = document.getElementById('app');
const root = ReactDOM.createRoot(container);
root.render(<App />);

