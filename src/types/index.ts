// Add your custom types here

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

// Example custom types - uncomment and modify as needed
// export interface Post {
//   id: string;
//   title: string;
//   content: string;
//   published: boolean;
//   createdAt: Date;
//   updatedAt: Date;
// }
