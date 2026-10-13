import { createRoot } from 'react-dom/client';
import { labGithub, lasStar } from 'line-awesome';
import { LaIcon } from 'line-awesome/react';
import LaHeart from '~icons/line-awesome/heart-solid';
// v1 CSS through a deep path: must survive `sideEffects` and the exports map.
import 'line-awesome/dist/line-awesome/css/line-awesome.min.css';

function App() {
  return (
    <p>
      <LaIcon icon={lasStar} title="Star" size={24} />
      <LaIcon icon={labGithub} className="brand" />
      <LaHeart />
      <i className="las la-bell" />
    </p>
  );
}

createRoot(document.getElementById('app')).render(<App />);
