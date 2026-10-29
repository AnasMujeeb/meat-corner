import wagyuSvg from '../assets/badges/badge-wagyu.svg';
import chickenSvg from '../assets/badges/badge-chicken.svg';
import healthySvg from '../assets/badges/badge-healthy.svg';
import fishSvg from '../assets/badges/badge-fish.svg';

export const BADGES = {
  wagyu: {
    id: 'wagyu',
    label: 'Wagyu',
    icon: wagyuSvg,
  },
  chicken: {
    id: 'chicken',
    label: 'Chicken',
    icon: chickenSvg,
  },
  healthy: {
    id: 'healthy',
    label: 'Healthy',
    icon: healthySvg,
  },
  fish: {
    id: 'fish',
    label: 'Fish',
    icon: fishSvg,
  },
};

export const BADGE_LIST = [
  BADGES.wagyu,
  BADGES.chicken,
  BADGES.healthy,
  BADGES.fish,
];

