import { useData } from './lib/data.js';
import { useSmoothScroll } from './lib/motion.js';
import Nav from './components/Nav.jsx';
import BackdropLayer from './three/BackdropLayer.jsx';
import Hero from './components/Hero.jsx';
import Problem from './components/Problem.jsx';
import Pipeline from './components/Pipeline.jsx';
import Playground from './components/Playground.jsx';
import TryYourOwn from './components/TryYourOwn.jsx';
import Results from './components/Results.jsx';
import Limits from './components/Limits.jsx';
import About from './components/About.jsx';

export default function App() {
  useSmoothScroll();
  const { data, error } = useData();
  if (error) return <p className="wrap err" style={{ paddingTop: 120 }}>The demo data could not be loaded. Check that public/data holds gallery.json and results.json. ({String(error.message || error)})</p>;
  if (!data) return <div style={{ minHeight: '100vh' }} aria-busy="true" />;
  return (
    <>
      <BackdropLayer />
      <a className="sr-only" href="#playground">Skip to the playground</a>
      <Nav />
      <main>
        <Hero hero={data.hero} />
        <Problem hero={data.hero} />
        <Pipeline hero={data.hero} />
        <Playground gallery={data.gallery} />
        <TryYourOwn hero={data.hero} />
        <Results results={data.results} />
        <Limits results={data.results} />
        <About />
      </main>
      {data.gallery.standin && <div className="standin">Stand-in images: replace public/data with the Colab export</div>}
    </>
  );
}
