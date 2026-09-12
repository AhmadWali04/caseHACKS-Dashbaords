import { getQuestions } from './actions';
import QuestionList from './QuestionList';

export default async function QuestionsPage() {
  const questions = await getQuestions();

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-primary mb-2">Manage Application Questions</h1>
        <p className="text-foreground/60 mb-8">
          Customize the questions that appear on the hacker application form.
        </p>
        
        <QuestionList initialQuestions={questions} />
      </div>
    </div>
  );
}
