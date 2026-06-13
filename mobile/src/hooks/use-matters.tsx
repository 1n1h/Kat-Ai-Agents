import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  loadMatters,
  saveMatters,
  uid,
  type Matter,
  type Msg,
} from "@/lib/store";

type Ctx = {
  ready: boolean;
  matters: Matter[];
  activeId: string | null;
  active: Matter | null;
  setActive: (id: string) => void;
  createMatter: (name: string) => Matter;
  appendMessage: (matterId: string, msg: Msg) => void;
  renameMatter: (id: string, name: string) => void;
  deleteMatter: (id: string) => void;
  resetAll: () => void;
};

const C = createContext<Ctx | null>(null);

export function MattersProvider({ children }: { children: ReactNode }) {
  const [matters, setMatters] = useState<Matter[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadMatters().then((loaded) => {
      let list = loaded;
      if (list.length === 0) {
        list = [{ id: uid(), name: "General", createdAt: Date.now(), messages: [] }];
      }
      setMatters(list);
      setActiveId(list[0].id);
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (ready) saveMatters(matters);
  }, [matters, ready]);

  const createMatter = (name: string) => {
    const m: Matter = {
      id: uid(),
      name: name.trim() || "Untitled matter",
      createdAt: Date.now(),
      messages: [],
    };
    setMatters((p) => [...p, m]);
    setActiveId(m.id);
    return m;
  };

  const appendMessage = (matterId: string, msg: Msg) =>
    setMatters((p) =>
      p.map((m) =>
        m.id === matterId ? { ...m, messages: [...m.messages, msg] } : m,
      ),
    );

  const renameMatter = (id: string, name: string) =>
    setMatters((p) =>
      p.map((m) => (m.id === id ? { ...m, name: name.trim() || m.name } : m)),
    );

  const deleteMatter = (id: string) =>
    setMatters((p) => {
      const next = p.filter((m) => m.id !== id);
      if (activeId === id) setActiveId(next[0]?.id ?? null);
      return next;
    });

  const resetAll = () => {
    const g: Matter = {
      id: uid(),
      name: "General",
      createdAt: Date.now(),
      messages: [],
    };
    setMatters([g]);
    setActiveId(g.id);
  };

  const active = matters.find((m) => m.id === activeId) ?? null;

  return (
    <C.Provider
      value={{
        ready,
        matters,
        activeId,
        active,
        setActive: setActiveId,
        createMatter,
        appendMessage,
        renameMatter,
        deleteMatter,
        resetAll,
      }}
    >
      {children}
    </C.Provider>
  );
}

export function useMatters(): Ctx {
  const c = useContext(C);
  if (!c) throw new Error("useMatters must be used within MattersProvider");
  return c;
}
