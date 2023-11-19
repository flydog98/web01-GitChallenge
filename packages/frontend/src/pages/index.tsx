import { CommandAccordion, QuizContent } from "../components/quiz";
import quizContentMockData from "../components/quiz/mock";
import { Button } from "../design-system/components/common";
import color from "../design-system/tokens/color";

export default function Home() {
  const { category, title, description, keywords } = quizContentMockData;
  return (
    <div
      style={{
        backgroundColor: "var(--mm-scale-color-grey-00)",
        height: "100vh",
      }}
    >
      <button type="button" onClick={handleTheme}>
        theme
      </button>
      <section
        style={{
          height: "545px",
          padding: "42px 36px 30px",
          position: "relative",
          border: `1px solid ${color.$semantic.border}`,
        }}
      >
        <div>
          <QuizContent
            category={category}
            title={title}
            description={description}
          />
          <div style={{ marginTop: "15px", marginBottom: "21px" }}>
            <CommandAccordion items={keywords} />
          </div>
        </div>
        <div style={{ position: "absolute", bottom: "30px", right: "36px" }}>
          <Button type="submit" variant="secondaryFill">
            모범 답안 확인하기
          </Button>
        </div>
      </section>
    </div>
  );
}

let theme = "light";

const handleTheme = () => {
  const nextTheme = theme === "light" ? "dark" : "light";
  document.documentElement.dataset.theme = nextTheme;
  theme = nextTheme;
};
