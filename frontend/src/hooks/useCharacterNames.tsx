import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT;

const CharacterNamesContext = createContext<Record<string, string> | null>(
  null,
);

async function fetchCharacterNames(): Promise<Record<string, string>> {
  const response = await fetch(`${API_ENDPOINT}/characters`);
  const parsed = (await response.json()) as [string, string][];
  return Object.fromEntries(parsed);
}

export function CharacterNamesProvider({ children }: { children: ReactNode }) {
  const [names, setNames] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    fetchCharacterNames()
      .then(setNames)
      .catch((error) => {
        console.error("Error fetching character list:", error);
      });
  }, []);

  return (
    <CharacterNamesContext.Provider value={names}>
      {children}
    </CharacterNamesContext.Provider>
  );
}

export function useCharacterNames(): Record<string, string> | null {
  return useContext(CharacterNamesContext);
}
