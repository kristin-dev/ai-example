import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SendSomeTextComponent } from './send-some-text/send-some-text.component';

interface Tab {
  id: string;
  label: string;
  icon?: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, SendSomeTextComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected title = 'Example for UCSF';

  activeTab = 'analyzer';

  tabs: Tab[] = [
    { id: 'analyzer', label: 'Text Analyzer', icon: '' },
    { id: 'books', label: 'Book Recommendations', icon: '' },
    { id: 'tree', label: 'Tree', icon: '' }
  ];

  setActiveTab(tabId: string): void {
    this.activeTab = tabId;
  }
}
