
import React from 'react';
import { SpeechIcon } from './icons/SpeechIcon';
import { ImageIcon } from './icons/ImageIcon';
import { ReportIcon } from './icons/ReportIcon';

interface WelcomeScreenProps {
  onContinue: () => void;
}

const FeatureCard: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
    <div className="flex flex-col items-center text-center p-6 bg-gray-50 rounded-xl border border-gray-200">
        <div className="mb-4 bg-blue-100 text-blue-600 rounded-full p-4">
            {icon}
        </div>
        <h3 className="text-lg font-bold text-gray-800 mb-2">{title}</h3>
        <p className="text-sm text-gray-600">{children}</p>
    </div>
);


const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onContinue }) => {
    return (
        <div className="w-full max-w-3xl bg-white p-8 md:p-10 rounded-2xl shadow-lg animate-fade-in text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">Vítejte v Asistentovi pro HACCP Audity</h2>
            <p className="text-md md:text-lg text-gray-600 mb-10">
                Váš inteligentní partner pro efektivní a přesné hygienické kontroly.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <FeatureCard icon={<SpeechIcon />} title="Inteligentní diktování">
                    Zapomeňte na zdlouhavé psaní. Jednoduše nadiktujte svá zjištění a naše AI je automaticky převede na strukturovaný a profesionálně formulovaný text.
                </FeatureCard>
                <FeatureCard icon={<ImageIcon />} title="Analýza fotografií">
                    Nahrajte fotografie a nechte umělou inteligenci identifikovat potenciální rizika. Získáte okamžitý popis, seznam rizik a doporučení k nápravě.
                </FeatureCard>
                <FeatureCard icon={<ReportIcon />} title="Automatizovaná zpráva">
                    Po dokončení auditu asistent vygeneruje komplexní závěrečnou zprávu, která shrnuje všechna zjištění v souladu s platnou legislativou.
                </FeatureCard>
            </div>

            <button
                onClick={onContinue}
                className="w-full max-w-xs mx-auto bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-transform transform hover:scale-105"
            >
                Pokračovat
            </button>
        </div>
    );
};

export default WelcomeScreen;
