import React from 'react';
import { SpeechIcon } from './icons/SpeechIcon';
import { ImageIcon } from './icons/ImageIcon';
import { ReportIcon } from './icons/ReportIcon';
import { Card, CardBody } from './ui/Card';
import { Button } from './ui/Button';

interface WelcomeScreenProps {
  onContinue: () => void;
}

const FeatureCard: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
    <Card hover className="h-full">
      <CardBody className="text-center">
        <div className="mb-4 bg-gradient-to-br from-primary-light to-primary text-white rounded-xl p-4 w-16 h-16 mx-auto flex items-center justify-center">
          {icon}
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-600">{children}</p>
      </CardBody>
    </Card>
);

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onContinue }) => {
    return (
        <div className="w-full max-w-5xl mx-auto">
          <Card>
            <CardBody>
              <div className="text-center mb-10">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary to-primary-light rounded-2xl mb-6">
                  <span className="text-4xl">🎯</span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                  Vítejte v Asistentovi pro HACCP Audity
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Váš inteligentní partner pro efektivní a přesné hygienické kontroly.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <FeatureCard icon={<SpeechIcon className="h-8 w-8" />} title="Inteligentní diktování">
                  Zapomeňte na zdlouhavé psaní. Jednoduše nadiktujte svá zjištění a naše AI je automaticky převede na strukturovaný a profesionálně formulovaný text.
                </FeatureCard>
                <FeatureCard icon={<ImageIcon className="h-8 w-8" />} title="Analýza fotografií">
                  Nahrajte fotografie a nechte umělou inteligenci identifikovat potenciální rizika. Získáte okamžitý popis, seznam rizik a doporučení k nápravě.
                </FeatureCard>
                <FeatureCard icon={<ReportIcon className="h-8 w-8" />} title="Automatizovaná zpráva">
                  Po dokončení auditu asistent vygeneruje komplexní závěrečnou zprávu, která shrnuje všechna zjištění v souladu s platnou legislativou.
                </FeatureCard>
              </div>

              <div className="text-center">
                <Button
                  variant="primary"
                  onClick={onContinue}
                  size="lg"
                  className="min-w-[200px]"
                >
                  Pokračovat
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
    );
};

export default WelcomeScreen;
