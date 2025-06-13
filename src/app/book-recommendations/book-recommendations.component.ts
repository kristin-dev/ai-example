import { Component, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface BookRecommendation {
  title: string;
  author: string;
  publication_year: string;
}

interface BookRecommendationResponse {
  analysis: string;
  recommendations: BookRecommendation[];
  reasoning: string;
  raw_response: string;
  model: string;
  status: string;
}

@Component({
  selector: 'app-book-recommendations',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './book-recommendations.component.html',
  styleUrl: './book-recommendations.component.scss'
})
export class BookRecommendationsComponent {
  private http = inject(HttpClient);

  inputText: string = 'Please recommend nonfiction books about teaching medicine, specifically books that mention anesthesiology.';
  response: BookRecommendationResponse | null = null;
  error: string | null = null;
  isLoading: boolean = false;

  // Using proxy URL instead of direct API URL to avoid CORS
  private apiUrl = '/api/books';

  getRecommendations(): void {
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

    this.http.post<BookRecommendationResponse>(this.apiUrl, payload, { headers })
      .subscribe(
        (data: BookRecommendationResponse) => {
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
            this.error = err.error?.message || err.message || 'An error occurred while getting book recommendations';
          }
          this.isLoading = false;
          console.error('API Error:', err);
          console.error('Error status:', err.status);
          console.error('Error details:', err);
        }
      );
  }

  formatBookList(recommendations: BookRecommendation[]): string {
    return recommendations.map((book, index) =>
      `${index + 1}. ${book.title} by ${book.author} (${book.publication_year})`
    ).join('\n');
  }
}
