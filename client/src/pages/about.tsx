import React from 'react';
import { FaLinkedin, FaLeaf, FaLightbulb, FaPeopleArrows } from 'react-icons/fa';
import Header from '@/components/header';
import { Card, CardContent } from '@/components/ui/card';

export default function About() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            About Ipê Mind Tree
          </h1>
          
          <div className="space-y-8">
            <Card className="bg-card text-card-foreground border-primary/10">
              <CardContent className="p-6">
                <h2 className="text-2xl font-semibold mb-4 text-primary">Our Mission</h2>
                <p className="text-foreground/90 leading-relaxed mb-4">
                  IMT (Ipê Mind Tree) is a DracoLogos initiative, envisioned by Stéfano Mastella, Matheus Fernandes, and Jason [Jason's Last Name], 
                  with a mission to spark a vibrant egregore of connected minds. We're igniting innovation and collaboration within the Ipê City community and far beyond.
                </p>
                <p className="text-foreground/90 leading-relaxed">
                  Inspired by collective wisdom and a vision of a seamlessly integrated future, IMT is your launchpad for sharing ideas, projects, and resources. 
                  We're here to cultivate groundbreaking solutions and forge stronger bonds among Ipê City participants.
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-card text-card-foreground border-primary/10">
              <CardContent className="p-6">
                <h2 className="text-2xl font-semibold mb-4 text-primary">Our Vision</h2>
                <p className="text-foreground/90 leading-relaxed mb-6">
                  We believe that by connecting creative and passionate minds, we can co-create a more thriving, sustainable, and interconnected world for everyone.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                      <FaLightbulb className="w-7 h-7 text-primary" />
                    </div>
                    <h3 className="font-medium text-lg mb-2">Innovation</h3>
                    <p className="text-foreground/70 text-sm">Fostering creative solutions through collective intelligence</p>
                  </div>
                  
                  <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                      <FaPeopleArrows className="w-7 h-7 text-primary" />
                    </div>
                    <h3 className="font-medium text-lg mb-2">Collaboration</h3>
                    <p className="text-foreground/70 text-sm">Building connections between diverse minds and perspectives</p>
                  </div>
                  
                  <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                      <FaLeaf className="w-7 h-7 text-primary" />
                    </div>
                    <h3 className="font-medium text-lg mb-2">Sustainability</h3>
                    <p className="text-foreground/70 text-sm">Creating solutions for a more balanced and thriving world</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-card text-card-foreground border-primary/10">
              <CardContent className="p-6">
                <h2 className="text-2xl font-semibold mb-4 text-primary">Our Team</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-3 overflow-hidden">
                      <img src="https://via.placeholder.com/200" alt="Stéfano Mastella" className="w-full h-full object-cover" />
                    </div>
                    <h3 className="font-medium text-lg mb-1">Stéfano Mastella</h3>
                    <p className="text-foreground/70 text-sm mb-3">Founder & Visionary</p>
                    <a 
                      href="https://www.linkedin.com/in/st%C3%A9fano-mastella-500353195/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center text-primary hover:text-primary/80 transition-colors"
                    >
                      <FaLinkedin className="mr-1" /> LinkedIn
                    </a>
                  </div>
                  
                  <div className="flex flex-col items-center text-center">
                    <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-3 overflow-hidden">
                      <img src="https://via.placeholder.com/200" alt="Matheus Fernandes" className="w-full h-full object-cover" />
                    </div>
                    <h3 className="font-medium text-lg mb-1">Matheus Fernandes</h3>
                    <p className="text-foreground/70 text-sm mb-3">Co-Founder & Developer</p>
                    <a 
                      href="https://www.linkedin.com/in/matheus-fernandes-9500461a0/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center text-primary hover:text-primary/80 transition-colors"
                    >
                      <FaLinkedin className="mr-1" /> LinkedIn
                    </a>
                  </div>
                  
                  <div className="flex flex-col items-center text-center">
                    <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-3 overflow-hidden">
                      <img src="https://via.placeholder.com/200" alt="Jason" className="w-full h-full object-cover" />
                    </div>
                    <h3 className="font-medium text-lg mb-1">Jason</h3>
                    <p className="text-foreground/70 text-sm mb-3">Co-Founder & Innovator</p>
                    <a 
                      href="#" 
                      className="flex items-center text-primary/50 cursor-not-allowed"
                    >
                      <FaLinkedin className="mr-1" /> LinkedIn (Coming soon)
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-card text-card-foreground border-primary/10">
              <CardContent className="p-6">
                <h2 className="text-2xl font-semibold mb-4 text-primary">Join Us</h2>
                <p className="text-foreground/90 leading-relaxed mb-4">
                  Be part of our growing community of innovators, creators, and change-makers. Share your ideas, 
                  connect with like-minded individuals, and contribute to the collective knowledge of Ipê Mind Tree.
                </p>
                <p className="text-foreground/90 leading-relaxed">
                  Together, we can create meaningful connections and solutions that make a difference.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}