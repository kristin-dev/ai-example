import {Component, inject} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {HttpClient, HttpHeaders} from '@angular/common/http';

// Interfaces for types used in this code - usually in a model file :)
// Everything is optional in case the AI messes up
interface BookRecommendation {
  title?: string;
  author?: string;
  publication_year?: string;
}

interface BookRecommendationResponse {
  analysis?: string;
  recommendations?: BookRecommendation[];
  reasoning?: string;
  raw_response?: string;
  model?: string;
  status?: string;
}

@Component({
  selector: 'app-book-recommendations',
  standalone: true,
  templateUrl: './book-recommendations.component.html',
  imports: [
    FormsModule
  ],
  styleUrls: ['./book-recommendations.component.scss'],
})

export class BookRecommendationsComponent {


  private http = inject(HttpClient);
  inputValue: string = '';
  response: BookRecommendationResponse | null = null;
  isLoading: boolean = false;
  error: string | null = null;
  private apiUrl = 'https://pdlw8deep0.execute-api.us-west-2.amazonaws.com/dev/books';

  logInConsole(): void {
    this.isLoading = true;

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });


    console.log(this.inputValue.trim());
    const payload = {
      text: this.inputValue.trim()
    };

    this.http.post<BookRecommendationResponse>(this.apiUrl, payload, { headers })
      .subscribe(
        (data: BookRecommendationResponse) => {
          this.response = data;
          this.isLoading = false;
          console.log('response', this.response);
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
}
