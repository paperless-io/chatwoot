require 'commonmarker'

class ChatwootMarkdownRenderer
  YOUTUBE_REGEX = %r{https?://(?:www\.)?(?:youtube\.com/watch\?v=|youtu\.be/)([^&/]+)}
  LOOM_REGEX = %r{https?://(?:www\.)?loom\.com/share/([^&/]+)}
  VIMEO_REGEX = %r{https?://(?:www\.)?vimeo\.com/(\d+)}
  MP4_REGEX = %r{https?://(?:www\.)?.+\.(mp4|mov)}

  def initialize(content)
    @content = content
  end

  def render_message
    html = Commonmarker.to_html(@content)
    render_as_html_safe(html)
  end

  def render_article
    doc = Commonmarker.parse(@content)

    doc.walk do |node|
      if node.type == :link
        new_node = render_embedded_content(node)
        node.replace(new_node) if new_node.present?
      elsif node.type == :code_block
        node.fence_info = 'js' if node.fence_info.empty?
      end
    end

    # We need unsafe here because we inserted html nodes
    html = doc.to_html(options: { render: { unsafe: true } },
                       plugins: { syntax_highlighter: { theme: 'InspiredGitHub' } })
    render_as_html_safe(html)
  end

  def render_markdown_to_plain_text
    html = Commonmarker.to_html(@content)
    html.to_plaintext
  end

  private

  def render_as_html_safe(html)
    # rubocop:disable Rails/OutputSafety
    html.html_safe
    # rubocop:enable Rails/OutputSafety
  end

  def render_embedded_content(node)
    link_url = node.url
    embedding_methods = {
      YOUTUBE_REGEX => :make_youtube_embed,
      VIMEO_REGEX => :make_vimeo_embed,
      MP4_REGEX => :make_video_embed,
      LOOM_REGEX => :make_loom_embed
    }

    embedding_methods.each do |regex, method|
      match = link_url.match(regex)
      return Commonmarker::Node.new(:html_inline, content: send(method, match)) if match.present?
    end

    nil
  end

  def make_youtube_embed(youtube_match)
    video_id = youtube_match[1]
    %(
      <div style="position: relative; padding-bottom: 62.5%; height: 0;">
       <iframe
        src="https://www.youtube.com/embed/#{video_id}"
        frameborder="0"
        style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen></iframe>
      </div>
    )
  end

  def make_loom_embed(loom_match)
    video_id = loom_match[1]
    %(
      <div style="position: relative; padding-bottom: 62.5%; height: 0;">
        <iframe
         src="https://www.loom.com/embed/#{video_id}"
         frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen
         style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></iframe>
      </div>
    )
  end

  def make_vimeo_embed(vimeo_match)
    video_id = vimeo_match[1]
    %(
      <div style="position: relative; padding-bottom: 62.5%; height: 0;">
       <iframe
        src="https://player.vimeo.com/video/#{video_id}"
        frameborder="0"
        allow="autoplay; fullscreen; picture-in-picture"
        allowfullscreen
        style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></iframe>
       </div>
    )
  end

  def make_video_embed(link_url)
    %(
      <video width="100%" autoplay loop>
        <source src="#{link_url}" type="video/mp4">
        Your browser does not support the video tag.
      </video>
    )
  end
end
