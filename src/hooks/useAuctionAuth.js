import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";

const AppUser = base44.entities.AppUser;
const MASTER_ADMIN_EMAIL = 'luizsantanna@tttcorporate.com';

export function useAuctionAuth() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const loadCurrentUser = useCallback(async () => {
    let userFound = null;

    const savedUserJSON = localStorage.getItem('currentUser');
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');
    if (savedUserJSON && isLoggedIn) {
      const userFromStorage = JSON.parse(savedUserJSON);
      try {
        const usersInDB = await AppUser.filter({ id: userFromStorage.id });
        if (usersInDB.length > 0) userFound = usersInDB[0];
      } catch (e) {
        console.debug("Falha ao validar AppUser no DB, tentando plataforma.", e);
      }
    }

    if (!userFound) {
      try {
        const platformUser = await base44.auth.me();
        if (platformUser) userFound = platformUser;
      } catch (e) {
        console.debug("Nenhum usuário da plataforma encontrado.", e.message);
      }
    }

    if (userFound) {
      if (userFound.email === MASTER_ADMIN_EMAIL) userFound.role = 'admin';
      if (userFound.role === 'admin') {
        setCurrentUser(userFound);
        setIsAdmin(true);
      } else {
        navigate(createPageUrl("Home"));
      }
    } else {
      navigate(createPageUrl("Home"));
    }
  }, [navigate]);

  return { currentUser, setCurrentUser, isAdmin, loadCurrentUser };
}