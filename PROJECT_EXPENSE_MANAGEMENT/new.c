#include <stdio.h>
#include <stdlib.h>
#include <string.h>

// Define constants
#define MAX_LOCATIONS 100
#define MAX_MOVIES 100
#define MAX_SEATS 100
#define MAX_SHOWTIMES 10

// Graph structure for locations
typedef struct Location
{
    char name[50];
    struct Location *neighbors[MAX_LOCATIONS];
    int neighbor_count;
} Location;

// Min-Heap structure for movies
typedef struct Movie
{
    char title[50];
    int showtimes[MAX_SHOWTIMES];
    int showtime_count;
} Movie;

typedef struct MinHeap
{
    Movie movies[MAX_MOVIES];
    int size;
} MinHeap;

// Stack structure for booking history
typedef struct Booking
{
    char movie_title[50];
    int seat_number;
    int showtime;
} Booking;

typedef struct Stack
{
    Booking bookings[MAX_SEATS];
    int top;
} Stack;

// Arrays for seats, showtimes, movies, and locations
int seats[MAX_SEATS];
Movie movies[MAX_MOVIES];
Location locations[MAX_LOCATIONS];
int location_count = 0;
int movie_count = 0;

// Function prototypes
void add_location(char *name);
void add_neighbor(int loc_index, int neighbor_index);
void add_movie(char *title, int *showtimes, int showtime_count);
void push_booking(Stack *stack, char *movie_title, int seat_number, int showtime);
Booking pop_booking(Stack *stack);
void heapify(MinHeap *heap, int i);
void insert_movie(MinHeap *heap, Movie movie);
Movie extract_min(MinHeap *heap);
void display_admin_menu();
void display_user_menu();
void handle_admin_input();
void handle_user_input();

int main()
{
    // Initialize data structures
    Stack booking_history = {.top = -1};
    MinHeap movie_heap = {.size = 0};

    // Admin adds movies
    handle_admin_input();

    // User interaction
    handle_user_input();

    return 0;
}

// Function implementations
void add_location(char *name)
{
    strcpy(locations[location_count].name, name);
    locations[location_count].neighbor_count = 0;
    location_count++;
}

void add_neighbor(int loc_index, int neighbor_index)
{
    locations[loc_index].neighbors[locations[loc_index].neighbor_count++] = &locations[neighbor_index];
}

void add_movie(char *title, int *showtimes, int showtime_count)
{
    strcpy(movies[movie_count].title, title);
    movies[movie_count].showtime_count = showtime_count;
    for (int i = 0; i < showtime_count; i++)
    {
        movies[movie_count].showtimes[i] = showtimes[i];
    }
    movie_count++;
}

void push_booking(Stack *stack, char *movie_title, int seat_number, int showtime)
{
    if (stack->top < MAX_SEATS - 1)
    {
        stack->top++;
        strcpy(stack->bookings[stack->top].movie_title, movie_title);
        stack->bookings[stack->top].seat_number = seat_number;
        stack->bookings[stack->top].showtime = showtime;
    }
}

Booking pop_booking(Stack *stack)
{
    Booking booking = {"", -1, -1};
    if (stack->top >= 0)
    {
        booking = stack->bookings[stack->top--];
    }
    return booking;
}

void heapify(MinHeap *heap, int i)
{
    int smallest = i;
    int left = 2 * i + 1;
    int right = 2 * i + 2;

    if (left < heap->size && strcmp(heap->movies[left].title, heap->movies[smallest].title) < 0)
    {
        smallest = left;
    }
    if (right < heap->size && strcmp(heap->movies[right].title, heap->movies[smallest].title) < 0)
    {
        smallest = right;
    }
    if (smallest != i)
    {
        Movie temp = heap->movies[i];
        heap->movies[i] = heap->movies[smallest];
        heap->movies[smallest] = temp;
        heapify(heap, smallest);
    }
}

void insert_movie(MinHeap *heap, Movie movie)
{
    if (heap->size < MAX_MOVIES)
    {
        heap->movies[heap->size] = movie;
        int i = heap->size;
        heap->size++;
        while (i != 0 && strcmp(heap->movies[(i - 1) / 2].title, heap->movies[i].title) > 0)
        {
            Movie temp = heap->movies[i];
            heap->movies[i] = heap->movies[(i - 1) / 2];
            heap->movies[(i - 1) / 2] = temp;
            i = (i - 1) / 2;
        }
    }
}

Movie extract_min(MinHeap *heap)
{
    if (heap->size <= 0)
    {
        Movie empty = {"", {0}, 0};
        return empty;
    }
    if (heap->size == 1)
    {
        heap->size--;
        return heap->movies[0];
    }
    Movie root = heap->movies[0];
    heap->movies[0] = heap->movies[heap->size - 1];
    heap->size--;
    heapify(heap, 0);
    return root;
}

void display_admin_menu()
{
    printf("Admin Menu\n");
    printf("1. Add Movie\n");
    printf("2. Exit Admin Menu\n");
    printf("Enter your choice: ");
}

void display_user_menu()
{
    printf("User Menu\n");
    printf("1. Book a Seat\n");
    printf("2. Undo Last Booking\n");
    printf("3. Exit\n");
    printf("Enter your choice: ");
}

void handle_admin_input()
{
    int choice;
    char movie_title[50];
    int showtimes[MAX_SHOWTIMES];
    int showtime_count;

    while (1)
    {
        display_admin_menu();
        scanf("%d", &choice);

        switch (choice)
        {
        case 1:
            printf("Enter movie title: ");
            scanf("%s", movie_title);
            printf("Enter number of showtimes: ");
            scanf("%d", &showtime_count);
            for (int i = 0; i < showtime_count; i++)
            {
                printf("Enter showtime %d: ", i + 1);
                scanf("%d", &showtimes[i]);
            }
            add_movie(movie_title, showtimes, showtime_count);
            break;
        case 2:
            return;
        default:
            printf("Invalid choice. Please try again.\n");
        }
    }
}

void handle_user_input()
{
    Stack booking_history = {.top = -1};
    int choice;
    int seat_number, showtime;
    char movie_title[50];

    while (1)
    {
        display_user_menu();
        scanf("%d", &choice);

        switch (choice)
        {
        case 1:
            printf("Available movies:\n");
            for (int i = 0; i < movie_count; i++)
            {
                printf("%d. %s\n", i + 1, movies[i].title);
            }
            printf("Enter movie number, seat number, and showtime: ");
            int movie_index;
            scanf("%d %d %d", &movie_index, &seat_number, &showtime);
            if (movie_index > 0 && movie_index <= movie_count)
            {
                strcpy(movie_title, movies[movie_index - 1].title);
                push_booking(&booking_history, movie_title, seat_number, showtime);
            }
            else
            {
                printf("Invalid movie number.\n");
            }
            break;
        case 2:
            if (booking_history.top >= 0)
            {
                Booking last_booking = pop_booking(&booking_history);
                printf("Last booking undone: %s, Seat: %d, Showtime: %d\n", last_booking.movie_title, last_booking.seat_number, last_booking.showtime);
            }
            else
            {
                printf("No bookings to undo.\n");
            }
            break;
        case 3:
            exit(0);
        default:
            printf("Invalid choice. Please try again.\n");
        }
    }
}