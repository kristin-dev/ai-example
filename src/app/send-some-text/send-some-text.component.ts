import { Component, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface AnalyzeResponse {
  grammar_issues: string;
  punctuation_issues: string;
  style_suggestions: string;
  corrected_version: string;
  style_enhanced_version: string;
  raw_feedback: string;
  model: string;
  status: string;
}

@Component({
  selector: 'app-send-some-text',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './send-some-text.component.html',
  styleUrl: './send-some-text.component.scss'
})
export class SendSomeTextComponent {
  private http = inject(HttpClient);

  inputText: string = 'Andy stirred the large pot of soup, watching as orange carrots and white potatoes bubbled in the broth. He and his mom had spent the morning cutting and dicing onions celery, and green beans.';
  response: AnalyzeResponse | null = null;
  error: string | null = null;
  isLoading: boolean = false;

  // Using proxy URL instead of direct API URL to avoid CORS
  private apiUrl = '/api/analyze';

  analyzeText(): void {
    if (!this.inputText.trim()) {
      return;
    }

    this.isLoading = true;
    this.error = null;
    this.response = null;

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });

    const payload = {
      text: this.inputText.trim()
    };

    this.http.post<AnalyzeResponse>(this.apiUrl, payload, { headers })
      .subscribe(
        (data: AnalyzeResponse) => {
          this.response = data;
          this.isLoading = false;
        },
        (err: any) => {
          // Enhanced error handling for CORS and other issues
          if (err.status === 0) {
            this.error = 'Network Error: Unable to connect to the API. Make sure the proxy is configured correctly.';
          } else if (err.status === 404) {
            this.error = 'API endpoint not found. Check the proxy configuration.';
          } else {
            this.error = err.error?.message || err.message || 'An error occurred while analyzing the text';
          }
          this.isLoading = false;
          console.error('API Error:', err);
          console.error('Error status:', err.status);
          console.error('Error details:', err);
        }
      );
  }

  formatResponse(response: AnalyzeResponse): string {
    return `Grammar Issues:\n${response.grammar_issues}\n\nPunctuation Issues:\n${response.punctuation_issues}\n\nStyle Suggestions:\n${response.style_suggestions}\n\nCorrected Version:\n${response.corrected_version}\n\nStyle Enhanced Version:\n${response.style_enhanced_version}`;
  }
}
