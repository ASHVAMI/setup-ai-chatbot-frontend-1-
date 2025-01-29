import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import ChatInterface from './components/ChatInterface';
import Auth from './components/Auth';

function App() {
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!session) {
    return <Auth onAuth={() => {}} />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <ChatInterface />
    </div>
  );
}

export default App;