// Global variables
let currentTab = 'explain';
let selectedDifficulty = 'easy';

// Initialize event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Tab switching
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => switchTab(button.dataset.tab));
    });

    // Difficulty selection
    document.querySelectorAll('.difficulty').forEach(button => {
        button.addEventListener('click', () => setDifficulty(button.dataset.level));
    });
});

// Tab switching function
function switchTab(tabId) {
    // Update active tab button
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.toggle('active', button.dataset.tab === tabId);
    });

    // Update visible content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === tabId);
    });

    currentTab = tabId;
}

// Set difficulty level
function setDifficulty(level) {
    document.querySelectorAll('.difficulty').forEach(button => {
        button.classList.toggle('active', button.dataset.level === level);
    });
    selectedDifficulty = level;
}

// Show/hide loading spinner
function toggleLoading(show) {
    document.getElementById('loading').classList.toggle('hidden', !show);
}

// API calls
async function makeAPICall(endpoint, data) {
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error('API request failed');
        }

        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        alert('An error occurred. Please try again.');
        return null;
    }
}

// Generate explanation
async function generateExplanation() {
    const topic = document.getElementById('explain-input').value.trim();
    
    if (!topic) {
        alert('Please enter a topic');
        return;
    }

    toggleLoading(true);
    
    const data = {
        text: topic,
        grade_level: document.getElementById('grade-level').value
    };

    const response = await makeAPICall('/api/explain', data);
    if (response) {
        displayResponse(response.response);
    }

    toggleLoading(false);
}

// Generate quiz
async function generateQuiz() {
    const topic = document.getElementById('quiz-input').value.trim();
    if (!topic) {
        alert('Please enter a topic');
        return;
    }

    toggleLoading(true);

    const data = {
        text: topic,
        difficulty: selectedDifficulty,
        num_questions: document.getElementById('num-questions').value,
        question_types: document.getElementById('question-types').value  // Pass the selected type
    };

    const response = await makeAPICall('/api/generate-quiz', data);
    if (response) {
        displayResponse(response.response);
    }

    toggleLoading(false);
}

// Generate teaching notes
async function generateNotes() {
    const topic = document.getElementById('notes-input').value.trim();
    if (!topic) {
        alert('Please enter a topic');
        return;
    }

    toggleLoading(true);

    const data = {
        text: topic,
        duration: document.getElementById('lesson-duration').value + ' minutes'
    };

    const response = await makeAPICall('/api/teaching-notes', data);
    if (response) {
        displayResponse(response.response);
    }

    toggleLoading(false);
}

function formatQuiz(quizData) {
    let html = '<div class="quiz-container">';
    html += '<h2>Generated Quiz</h2>';
    
    // Format each question
    quizData.questions.forEach((q, index) => {
        html += `
            <div class="quiz-question" data-question-index="${index}">
                <h3>Question ${index + 1}</h3>
                <p class="question-text">${q.question}</p>
                
                ${q.type === 'multiple_choice' ? `
                    <div class="options">
                        ${q.options.map(option => `
                            <div class="option">
                                <input type="radio" 
                                       id="q${index}_${option}" 
                                       name="q${index}" 
                                       value="${option}"
                                       onchange="checkAnswer(${index}, '${option}', '${q.correct_answer}')">
                                <label for="q${index}_${option}">${option}</label>
                            </div>
                        `).join('')}
                    </div>
                ` : `
                    <div class="short-answer">
                        <input type="text" 
                               placeholder="Enter your answer"
                               onkeyup="checkShortAnswer(${index}, '${q.correct_answer}', event)">
                        <button onclick="submitShortAnswer(${index}, '${q.correct_answer}')" class="submit-answer">
                            Submit Answer
                        </button>
                    </div>
                `}
                
                <div class="feedback hidden" id="feedback-${index}">
                    <div class="feedback-content"></div>
                </div>
                
                <div class="explanation hidden" id="explanation-${index}">
                    <h4>Explanation:</h4>
                    <p>${q.explanation}</p>
                </div>
            </div>
        `;
    });

    html += `
        <div class="quiz-summary hidden" id="quiz-summary">
            <h3>Quiz Summary</h3>
            <p>Score: <span id="quiz-score">0</span>/${quizData.questions.length}</p>
            <button onclick="resetQuiz()" class="reset-quiz">Reset Quiz</button>
        </div>
    `;
    
    html += '</div>';
    return html;
}

// Function to check multiple choice answers
function checkAnswer(questionIndex, selectedAnswer, correctAnswer) {
    const feedbackDiv = document.getElementById(`feedback-${questionIndex}`);
    const feedbackContent = feedbackDiv.querySelector('.feedback-content');
    const explanationDiv = document.getElementById(`explanation-${questionIndex}`);
    const questionDiv = feedbackDiv.closest('.quiz-question');
    
    // Remove previous feedback classes
    questionDiv.classList.remove('correct', 'incorrect');
    
    const isCorrect = selectedAnswer === correctAnswer;
    
    // Add new feedback class
    questionDiv.classList.add(isCorrect ? 'correct' : 'incorrect');
    
    // Show feedback
    feedbackContent.innerHTML = isCorrect ? 
        '<span class="correct-answer">✓ Correct!</span>' : 
        `<span class="incorrect-answer">✗ Incorrect. The correct answer is: ${correctAnswer}</span>`;
    
    feedbackDiv.classList.remove('hidden');
    explanationDiv.classList.remove('hidden');
    
    updateQuizScore();
}

// Function to check short answer questions
function submitShortAnswer(questionIndex, correctAnswer) {
    const input = document.querySelector(`.quiz-question[data-question-index="${questionIndex}"] input[type="text"]`);
    const userAnswer = input.value.trim().toLowerCase();
    const normalizedCorrectAnswer = correctAnswer.toLowerCase();
    
    checkAnswer(questionIndex, userAnswer, normalizedCorrectAnswer);
}

// Function to handle Enter key in short answer
function checkShortAnswer(questionIndex, correctAnswer, event) {
    if (event.key === 'Enter') {
        submitShortAnswer(questionIndex, correctAnswer);
    }
}

// Function to update quiz score
function updateQuizScore() {
    const totalQuestions = document.querySelectorAll('.quiz-question').length;
    const correctAnswers = document.querySelectorAll('.quiz-question.correct').length;
    
    const summaryDiv = document.getElementById('quiz-summary');
    const scoreSpan = document.getElementById('quiz-score');
    
    scoreSpan.textContent = correctAnswers;
    summaryDiv.classList.remove('hidden');
}

// Function to reset the quiz
function resetQuiz() {
    const questions = document.querySelectorAll('.quiz-question');
    questions.forEach(question => {
        // Reset classes
        question.classList.remove('correct', 'incorrect');
        
        // Reset radio buttons
        const radioInputs = question.querySelectorAll('input[type="radio"]');
        radioInputs.forEach(input => input.checked = false);
        
        // Reset text inputs
        const textInputs = question.querySelectorAll('input[type="text"]');
        textInputs.forEach(input => input.value = '');
        
        // Hide feedback and explanation
        const feedback = question.querySelector('.feedback');
        const explanation = question.querySelector('.explanation');
        feedback.classList.add('hidden');
        explanation.classList.add('hidden');
    });
    
    // Reset summary
    const summaryDiv = document.getElementById('quiz-summary');
    summaryDiv.classList.add('hidden');
}

// Add this function to handle showing/hiding explanations
function toggleExplanation(questionIndex) {
    const explanationDiv = document.querySelectorAll('.explanation')[questionIndex];
    const button = document.querySelectorAll('.show-explanation')[questionIndex];
    
    if (explanationDiv.classList.contains('hidden')) {
        explanationDiv.classList.remove('hidden');
        button.textContent = 'Hide Explanation';
    } else {
        explanationDiv.classList.add('hidden');
        button.textContent = 'Show Explanation';
    }
}

// Display response
function displayResponse(content) {
    const responseSection = document.getElementById('response');
    const responseContent = document.getElementById('response-content');
    
    // Try to parse as JSON first (for quizzes)
    try {
        const quizData = JSON.parse(content);
        if (quizData.questions) {
            // It's a quiz, format it accordingly
            const formattedQuiz = formatQuiz(quizData);
            responseContent.innerHTML = formattedQuiz;
        } else {
            // Regular markdown content
            responseContent.innerHTML = marked.parse(content);
        }
    } catch (e) {
        // Not JSON, treat as regular markdown
        responseContent.innerHTML = marked.parse(content);
    }
    
    responseSection.classList.remove('hidden');
    responseSection.scrollIntoView({ behavior: 'smooth' });
}

// Copy response content
function copyContent() {
    const content = document.getElementById('response-content').textContent;
    navigator.clipboard.writeText(content)
        .then(() => alert('Content copied to clipboard!'))
        .catch(err => console.error('Failed to copy:', err));
}

// Download response content
function downloadContent() {
    const content = document.getElementById('response-content').textContent;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    a.href = url;
    a.download = `hocazeka-${currentTab}-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}