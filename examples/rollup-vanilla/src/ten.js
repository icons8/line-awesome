import {
  lasStar,
  larStar,
  labGithub,
  lasHeart,
  lasHome,
  lasSearch,
  lasUser,
  lasCog,
  lasTimes,
  lasBars,
} from 'line-awesome';
import { toSvgString } from 'line-awesome/core';

document.body.innerHTML = [lasStar, larStar, labGithub, lasHeart, lasHome, lasSearch, lasUser, lasCog, lasTimes, lasBars]
  .map((icon) => toSvgString(icon))
  .join('');
