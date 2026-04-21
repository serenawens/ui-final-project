(function () {
  function getGitUser() {
    return localStorage.getItem("gituser") || "";
  }

  function setGitUser(gituser) {
    localStorage.setItem("gituser", gituser);
  }

  function getScoreState() {
    const raw = localStorage.getItem("quizScoreState");
    if (!raw) return { correct: 0, total: 0 };
    try {
      return JSON.parse(raw);
    } catch (e) {
      return { correct: 0, total: 0 };
    }
  }

  function setScoreState(state) {
    localStorage.setItem("quizScoreState", JSON.stringify(state));
  }

  function resetScoreState() {
    setScoreState({ correct: 0, total: 0 });
  }

  function saveGitUserFromHome() {
    const value = ($("#gituserInput").val() || "").trim();
    if (value) setGitUser(value);
    return value || getGitUser();
  }

  function attachHomeHandlers() {
    const existingGitUser = getGitUser();
    if (existingGitUser) {
      $("#gituserInput").val(existingGitUser);
    }

    $("#startQuizBtn").on("click", function (e) {
      const gituser = saveGitUserFromHome();
      if (!gituser) {
        e.preventDefault();
        alert("Please enter your gituser first.");
        return;
      }
      resetScoreState();
    });
  }

  function logLearnVisit(pageId) {
    $.ajax({
      url: "/api/activity/learn-visit",
      method: "POST",
      contentType: "application/json",
      data: JSON.stringify({
        gituser: getGitUser(),
        page_id: Number(pageId),
      }),
    });
  }

  function renderProgressDots(current, total) {
    const dotCount = Number(total) || 0;
    let html = "";
    for (let i = 1; i <= dotCount; i += 1) {
      let stateClass = "";
      if (i < current) stateClass = "dot-complete";
      if (i === current) stateClass = "dot-active";
      html += '<span class="progress-dot ' + stateClass + '"></span>';
    }
    $("#progressDots").html(html);
  }

  function attachQuizPage(questionId) {
    $.getJSON("/api/quiz/" + questionId)
      .done(function (payload) {
        const question = payload.question;
        const total = payload.total_questions;

        $("#quizProgressText").text("Question " + question.id + " of " + total);
        $("#questionText").text(question.question + "?");
        renderProgressDots(question.id, total);

        if (question.care_tag_image) {
          $("#careTagImage").attr("src", question.care_tag_image).removeClass("d-none");
        } else {
          $("#careTagCard").addClass("d-none");
        }

        let choicesHtml = "";
        question.choices.forEach(function (choice) {
          choicesHtml +=
            '<div class="col-md-6">' +
            '<button class="btn choice-btn w-100 text-start p-3" data-choice-id="' +
            choice.id +
            '">' +
            choice.id +
            ") " +
            choice.text +
            "</button>" +
            "</div>";
        });
        $("#choicesContainer").html(choicesHtml);

        $(".choice-btn").on("click", function () {
          const selectedChoice = $(this).data("choice-id");
          $(".choice-btn").removeClass("choice-selected");
          $(this).addClass("choice-selected");
          $(".choice-btn").prop("disabled", true);
          submitQuizAnswer(question, selectedChoice);
        });
      })
      .fail(function () {
        $("#questionText").text("Question not found.");
      });
  }

  function submitQuizAnswer(question, selectedChoice) {
    $.ajax({
      url: "/api/activity/quiz-answer",
      method: "POST",
      contentType: "application/json",
      data: JSON.stringify({
        gituser: getGitUser(),
        question_id: question.id,
        selected_choice: selectedChoice,
      }),
    })
      .done(function (resp) {
        const isCorrect = resp.is_correct;
        const feedbackText = isCorrect ? resp.feedback.correct : resp.feedback.incorrect;

        const score = getScoreState();
        const updated = {
          correct: score.correct + (isCorrect ? 1 : 0),
          total: score.total + 1,
        };
        setScoreState(updated);

        $("#feedbackPanel").removeClass("d-none");
        $("#feedbackHeading")
          .toggleClass("text-success", isCorrect)
          .toggleClass("text-danger", !isCorrect)
          .html(isCorrect ? "&#10003; Correct!" : "&#10007; Wrong");
        $("#feedbackText").text(feedbackText);
        $("#nextQuestionBtn").data("next-id", resp.next_id);

        $("#nextQuestionBtn")
          .off("click")
          .on("click", function () {
            const nextId = $(this).data("next-id");
            if (nextId) {
              window.location.href = "/quiz/question/" + nextId;
            } else {
              window.location.href = "/quiz/end";
            }
          });
      })
      .fail(function () {
        $("#feedbackPanel").removeClass("d-none");
        $("#feedbackHeading").addClass("text-danger").html("&#10007; Could not save answer");
        $("#feedbackText").text("Try again by reloading this page.");
      });
  }

  function renderResults() {
    const score = getScoreState();
    $("#scoreValue").text(score.correct + " / " + score.total);
  }

  $(function () {
    const pageType = $("section[data-page-type]").data("page-type");
    if (pageType === "learn") {
      const pageId = $("section[data-page-id]").data("page-id");
      logLearnVisit(pageId);
      return;
    }

    if (pageType === "quiz") {
      const questionId = $("section[data-question-id]").data("question-id");
      attachQuizPage(questionId);
      return;
    }

    if (pageType === "quiz-results") {
      renderResults();
      return;
    }

    attachHomeHandlers();
  });
})();
$(document).ready(function () {
 
  // Smooth fade-in on page load
  $("main").css("opacity", 0).animate({ opacity: 1 }, 300);
 
  // Highlight active nav link
  const path = window.location.pathname;
  $(".nav-links a").each(function () {
    if (path.startsWith($(this).attr("href"))) {
      $(this).addClass("active");
    }
  });
 
});
