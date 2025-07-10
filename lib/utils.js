import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"
 
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function randomPick(array, n=3) {
  const arrayCopy = [...array];
  const selected = [];
  
  for (let i = 0; i < n; i++) {
      const randomIndex = i + Math.floor(Math.random() * (arrayCopy.length - i));
      [arrayCopy[i], arrayCopy[randomIndex]] = [arrayCopy[randomIndex], arrayCopy[i]];
      
      selected.push(arrayCopy[i]);
  }
  
  return selected;
}
