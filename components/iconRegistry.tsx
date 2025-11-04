import React from 'react';
import { FiAlertCircle } from 'react-icons/fi';
import {
  HomeIcon, SettingsIcon, CheckmarkIcon, ReportIcon, WarningIcon, InfoIcon, 
  TrashIcon, PlusIcon, EditIcon, SaveIcon, XIcon, CameraIcon, ImageIcon,
  MicrophoneIcon, SpeechIcon, ClockIcon, ChecklistIcon
} from './icons';

// Typ pro ikonu
export interface IconOption {
  id: string;
  name: string;
  component: React.ComponentType<any>;
  category: string;
}

// Kategorizovaný seznam ikon - pouze původní ikony z projektu
export const iconCategories: { [key: string]: IconOption[] } = {
  'Základní': [
    { id: 'home', name: 'Domov', component: HomeIcon, category: 'Základní' },
    { id: 'checkmark', name: 'Zaškrtnutí', component: CheckmarkIcon, category: 'Základní' },
    { id: 'settings', name: 'Nastavení', component: SettingsIcon, category: 'Základní' },
    { id: 'info', name: 'Info', component: InfoIcon, category: 'Základní' },
    { id: 'warning', name: 'Varování', component: WarningIcon, category: 'Základní' },
    { id: 'edit', name: 'Úprava', component: EditIcon, category: 'Základní' },
    { id: 'delete', name: 'Smazat', component: TrashIcon, category: 'Základní' },
    { id: 'plus', name: 'Plus', component: PlusIcon, category: 'Základní' },
    { id: 'close', name: 'Zavřít', component: XIcon, category: 'Základní' },
    { id: 'save', name: 'Uložit', component: SaveIcon, category: 'Základní' },
    { id: 'alert-circle', name: 'Upozornění', component: FiAlertCircle, category: 'Základní' },
  ],
  'Dokumenty a zprávy': [
    { id: 'report', name: 'Zpráva', component: ReportIcon, category: 'Dokumenty a zprávy' },
    { id: 'checklist', name: 'Seznam', component: ChecklistIcon, category: 'Dokumenty a zprávy' },
    { id: 'clock', name: 'Hodiny', component: ClockIcon, category: 'Dokumenty a zprávy' },
  ],
  'Média': [
    { id: 'camera', name: 'Fotoaparát', component: CameraIcon, category: 'Média' },
    { id: 'image', name: 'Obrázek', component: ImageIcon, category: 'Média' },
    { id: 'microphone', name: 'Mikrofon', component: MicrophoneIcon, category: 'Média' },
    { id: 'speech', name: 'Řeč', component: SpeechIcon, category: 'Média' },
  ],
};

// Vytvořit plochý seznam všech ikon
export const allIcons: IconOption[] = Object.values(iconCategories).flat();

// Mapování pro rychlý přístup podle ID
export const iconMapById: { [key: string]: React.ComponentType<any> } = {};
allIcons.forEach(icon => {
  iconMapById[icon.id] = icon.component;
});
