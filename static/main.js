(function () {
  const UNI_KEY = "uni";
  const SCORE_KEY = "quizScoreState";
  const VISITED_MATERIALS_KEY = "visitedMaterials";

  function getUni() {
    return localStorage.getItem(UNI_KEY) || "";
  }

  function setUni(uni) {
    localStorage.setItem(UNI_KEY, uni);
  }

  function getVisitedMaterials() {
    const raw = localStorage.getItem(VISITED_MATERIALS_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch (e) {
      return [];
    }
  }

  function setVisitedMaterials(materials) {
    localStorage.setItem(VISITED_MATERIALS_KEY, JSON.stringify(materials));
  }

  function addVisitedMaterial(materialId) {
    const visited = getVisitedMaterials();
    if (!visited.includes(materialId)) {
      visited.push(materialId);
      setVisitedMaterials(visited);
    }
    return visited;
  }

  function requireUni(onReady) {
    const existing = getUni();
    if (existing) {
      onReady(existing);
      return;
    }

    const modalEl = document.getElementById("uniModal");
    if (!modalEl) {
      onReady("");
      return;
    }

    const uniModal = new bootstrap.Modal(modalEl);
    uniModal.show();

    $("#saveUniBtn")
      .off("click")
      .on("click", function () {
        const value = ($("#uniInput").val() || "").trim();
        if (!value) {
          alert("Please enter your UNI.");
          return;
        }
        setUni(value);
        uniModal.hide();
        onReady(value);
      });
  }

  function logActivity(url, payload) {
    return $.ajax({
      url: url,
      method: "POST",
      contentType: "application/json",
      data: JSON.stringify(payload),
    });
  }

  function getScoreState() {
    const raw = localStorage.getItem(SCORE_KEY);
    if (!raw) return { correct: 0, total: 0 };
    try {
      return JSON.parse(raw);
    } catch (e) {
      return { correct: 0, total: 0 };
    }
  }

  function setScoreState(state) {
    localStorage.setItem(SCORE_KEY, JSON.stringify(state));
  }

  function resetScoreState() {
    setScoreState({ correct: 0, total: 0 });
  }

  function attachHomeHandlers() {
    // Reset care label first-seen tracker on home page load
    localStorage.removeItem("careLabelFirstSeen");
    localStorage.removeItem(VISITED_MATERIALS_KEY);

    $("#startLearningBtn").on("click", function () {
      requireUni(function () {
        $("#materialPicker").removeClass("d-none");
        $("#materialPicker")[0].scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });

    $(".material-option-card").on("click", function () {
      const materialId = $(this).data("material-id");
      const uni = getUni();
      if (materialId) {
        logActivity("/api/activity/learn-selection", {
          uni: uni,
          material_id: String(materialId),
        });
      }
    });
  }

  function setupLearnSlides() {
    const section = $("section[data-page-type='learn-material']");
    const materialId = String(section.data("material-id") || "");
    const slides = $("#learnSlides .learn-slide");
    let activeIndex = 0;
    const CARE_LABEL_FIRST_SEEN_KEY = "careLabelFirstSeen";

    addVisitedMaterial(materialId);
    logActivity("/api/activity/learn-visit", {
      uni: getUni(),
      material_id: materialId,
    });

    function updateNextMaterialPanel() {
      const visited = getVisitedMaterials();
      let remainingCount = 0;

      // Hide already-visited materials while there are still new ones left.
      $("#nextMaterialGrid .material-option-card").each(function () {
        const cardMaterialId = String($(this).data("material-id") || "");
        if (visited.includes(cardMaterialId)) {
          $(this).closest(".col-md-6").addClass("d-none");
        } else {
          $(this).closest(".col-md-6").removeClass("d-none");
          remainingCount += 1;
        }
      });

      // Once all are completed, show everything again for optional review.
      if (remainingCount === 0) {
        $("#nextMaterialGrid .material-option-card").each(function () {
          $(this).closest(".col-md-6").removeClass("d-none");
        });
        $("#nextMaterialTitle").text("All Materials Completed");
        $("#nextMaterialSubtitle").text("You can review any material again, or proceed to the quiz.");
        $("#nextMaterialGrid").removeClass("d-none");
        $("#finalQuizPanel").removeClass("d-none");
      } else {
        $("#nextMaterialTitle").text("Choose the Next Material");
        $("#nextMaterialSubtitle").text("Keep going until you finish every material.");
        $("#nextMaterialGrid").removeClass("d-none");
        $("#finalQuizPanel").addClass("d-none");
      }
    }

    function renderSlide() {
      slides.removeClass("is-active").eq(activeIndex).addClass("is-active");
      const progress = ((activeIndex + 1) / slides.length) * 100;
      $("#learnProgressBar").css("width", progress + "%");
      $("#learnPrevBtn").prop("disabled", activeIndex === 0);

      const isLast = activeIndex === slides.length - 1;
      $("#learnNextBtn").toggle(!isLast);
      const stepId = slides.eq(activeIndex).data("step-id");
      
      // Update care-label heading: first time vs. repeat visits
      if (String(stepId) === "care-label") {
        const hasSeenCareLabelBefore = localStorage.getItem(CARE_LABEL_FIRST_SEEN_KEY);
        if (!hasSeenCareLabelBefore) {
          $("#careLabelHeading").text("How to Read a Care Label");
          localStorage.setItem(CARE_LABEL_FIRST_SEEN_KEY, "true");
        } else {
          $("#careLabelHeading").text("Let's do a quick review on what these mean");
        }
      }
      
      logActivity("/api/activity/learn-step", {
        uni: getUni(),
        material_id: materialId,
        step_id: String(stepId || "unknown"),
      });

      if (String(stepId) === "next-material") {
        updateNextMaterialPanel();
      }
    }

    $("#learnPrevBtn").on("click", function () {
      if (activeIndex > 0) {
        activeIndex -= 1;
        renderSlide();
      }
    });

    $("#learnNextBtn").on("click", function () {
      if (activeIndex < slides.length - 1) {
        activeIndex += 1;
        renderSlide();
      }
    });

    $("#nextMaterialGrid .material-option-card").on("click", function () {
      const selectedMaterial = $(this).data("material-id");
      logActivity("/api/activity/learn-selection", {
        uni: getUni(),
        material_id: String(selectedMaterial),
      });
    });

    renderSlide();
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

  function attachQuizHomeHandlers() {
    const existingUni = getUni();

    $("#startQuizBtn").on("click", function (e) {
      const uni = existingUni;
      if (!uni) {
        e.preventDefault();
        alert("Please start from the home page to enter your UNI.");
        return;
      }
      resetScoreState();
    });
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
        uni: getUni(),
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
    $("main").css("opacity", 0).animate({ opacity: 1 }, 250);

    const pageType = $("section[data-page-type]").data("page-type");

    if (pageType === "home") {
      attachHomeHandlers();
      return;
    }

    if (pageType === "learn-material") {
      setupLearnSlides();
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

    attachQuizHomeHandlers();
  });
})();
