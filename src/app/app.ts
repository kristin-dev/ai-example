import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SendSomeTextComponent } from './send-some-text/send-some-text.component';
import {BookRecommendationsComponent} from './book-recommendations/book-recommendations.component';

interface Tab {
  id: string;
  label: string;
  icon?: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, SendSomeTextComponent, BookRecommendationsComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected title = 'Example for UCSF';

  activeTab = 'books';

  tabs: Tab[] = [
    { id: 'books', label: 'Book Recommendations', icon: '' },
    { id: 'analyzer', label: 'Text Analyzer', icon: '' },
  ];

  setActiveTab(tabId: string): void {
    this.activeTab = tabId;
  }
}
